import test from 'node:test';
import assert from 'node:assert/strict';

import { extractMathCards } from '../src/mathCards.js';

test('renders an unlabeled TeX code fence like the Navier-Stokes response', () => {
  const expression =
    '\\rho (\\frac{\\partial\\vec{V}}{\\partial t}+(\\vec{V}\\cdot \\vec{\\nabla})\\vec{V}) = - \\vec{\\nabla} P + \\mu \\nabla^2 \\vec{V}';
  const output = extractMathCards(`Vector form:\n\`\`\`\n${expression}\n\`\`\``);

  assert.equal(output.files.length, 1);
  assert.ok(Buffer.isBuffer(output.files[0].attachment));
  assert.doesNotMatch(output.content, /\\rho|```/u);
});

test('renders math fences and bracket-delimited display math', () => {
  const fenced = extractMathCards('```math\nE = mc^2\n```');
  const bracketed = extractMathCards('Result: \\[\\frac{1}{2}mv^2\\]');

  assert.equal(fenced.files.length, 1);
  assert.equal(bracketed.files.length, 1);
});

test('leaves unlabeled non-math code fences unchanged', () => {
  const input = '```\nhello world\n```';
  const output = extractMathCards(input);

  assert.equal(output.content, input);
  assert.equal(output.files.length, 0);
});
