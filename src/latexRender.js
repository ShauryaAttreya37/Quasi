import { mathjax } from 'mathjax-full/js/mathjax.js';
import { TeX } from 'mathjax-full/js/input/tex.js';
import { SVG } from 'mathjax-full/js/output/svg.js';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html.js';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js';
import { Resvg } from '@resvg/resvg-js';

// One shared MathJax document; building it is the expensive part.
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const texInput = new TeX({ packages: AllPackages });
const svgOutput = new SVG({ fontCache: 'local' });
const mathDocument = mathjax.document('', { InputJax: texInput, OutputJax: svgOutput });

const MAX_INPUT_LENGTH = 2000;
const FOREGROUND = '#111111';
const BACKGROUND = '#ffffff';
const RENDER_ZOOM = 3.5; // SVG -> PNG upscale for crisp glyphs

export class LatexRenderError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LatexRenderError';
  }
}

function texToSvg(expression, displayMode) {
  const node = mathDocument.convert(expression, { display: displayMode });
  // liteAdaptor.innerHTML on the wrapper returns just the <svg>...</svg>.
  return adaptor.innerHTML(node);
}

function findTexError(svg) {
  // MathJax embeds parse errors as <text data-mjx-error="..."> / merror nodes.
  const match = svg.match(/data-mjx-error="([^"]*)"/u);
  return match ? match[1].replace(/&amp;/gu, '&').replace(/&quot;/gu, '"') : undefined;
}

/**
 * Render a LaTeX expression to a PNG buffer.
 * @param {string} expression raw TeX (no surrounding $/$$)
 * @param {{ display?: boolean }} [options]
 * @returns {{ buffer: Buffer, width: number, height: number }}
 */
export function renderLatexToPng(expression, options = {}) {
  const source = String(expression ?? '').trim();
  if (!source) {
    throw new LatexRenderError('Empty expression.');
  }
  if (source.length > MAX_INPUT_LENGTH) {
    throw new LatexRenderError(`Expression too long (max ${MAX_INPUT_LENGTH} characters).`);
  }

  const display = options.display !== false;
  let svg;
  try {
    svg = texToSvg(source, display);
  } catch (error) {
    throw new LatexRenderError(`Failed to parse LaTeX: ${error.message}`);
  }

  const texError = findTexError(svg);
  if (texError) {
    throw new LatexRenderError(`LaTeX error: ${texError}`);
  }

  // MathJax glyphs use currentColor; resvg has no DOM cascade, so inline the color.
  const colored = svg.replace(/currentColor/gu, FOREGROUND);

  try {
    const resvg = new Resvg(colored, {
      background: BACKGROUND,
      fitTo: { mode: 'zoom', value: RENDER_ZOOM }
    });
    const rendered = resvg.render();
    const buffer = rendered.asPng();
    return { buffer, width: rendered.width, height: rendered.height };
  } catch (error) {
    throw new LatexRenderError(`Failed to rasterize equation: ${error.message}`);
  }
}
