import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp, readFile, rm } from 'node:fs/promises';

const SCRIPT_PATH = join(dirname(fileURLToPath(import.meta.url)), 'python', 'plot3d.py');
const DEFAULT_TIMEOUT_MS = 15000;

export class Plot3dError extends Error {
  constructor(message) {
    super(message);
    this.name = 'Plot3dError';
  }
}

/**
 * Render a 3D plot by spawning the Python matplotlib worker.
 * @param {object} job plot job (see plot3d.py docstring) without `output`
 * @param {{ pythonBin?: string, timeoutMs?: number }} [options]
 * @returns {Promise<{ buffer: Buffer }>}
 */
export async function renderPlot3d(job, options = {}) {
  const pythonBin = options.pythonBin || process.env.QUASI_PYTHON_BIN || 'python3';
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  const workDir = await mkdtemp(join(tmpdir(), 'quasi-plot-'));
  const outputPath = join(workDir, 'plot.png');
  const payload = JSON.stringify({ ...job, output: outputPath });

  try {
    const result = await runPython(pythonBin, payload, timeoutMs);
    if (!result.ok) {
      throw new Plot3dError(result.error || 'Plot generation failed.');
    }
    const buffer = await readFile(outputPath);
    return { buffer };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

function runPython(pythonBin, payload, timeoutMs) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(pythonBin, [SCRIPT_PATH], { stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (error) {
      reject(new Plot3dError(`Failed to launch Python (${pythonBin}): ${error.message}`));
      return;
    }

    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGKILL');
      reject(new Plot3dError('Plot generation timed out.'));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const hint =
        error.code === 'ENOENT'
          ? `Python not found at "${pythonBin}". Set QUASI_PYTHON_BIN.`
          : error.message;
      reject(new Plot3dError(hint));
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const lastLine = stdout.trim().split('\n').filter(Boolean).pop();
      if (lastLine) {
        try {
          resolve(JSON.parse(lastLine));
          return;
        } catch {
          // fall through to error below
        }
      }
      reject(new Plot3dError(`Python exited with code ${code}. ${stderr.trim().slice(0, 300)}`));
    });

    child.stdin.write(payload);
    child.stdin.end();
  });
}
