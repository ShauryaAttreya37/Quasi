import { test } from 'node:test';
import assert from 'node:assert/strict';

import { renderLatexToPng, LatexRenderError } from '../src/latexRender.js';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

test('renders a valid expression to a PNG buffer', () => {
  const { buffer, width, height } = renderLatexToPng('\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}');
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 100);
  assert.ok(buffer.subarray(0, 4).equals(PNG_MAGIC), 'output starts with PNG magic bytes');
  assert.ok(width > 0 && height > 0);
});

test('renders inline mode', () => {
  const { buffer } = renderLatexToPng('x^2 + y^2 = r^2', { display: false });
  assert.ok(buffer.length > 100);
});

test('rejects an empty expression', () => {
  assert.throws(() => renderLatexToPng('   '), LatexRenderError);
});

test('rejects an over-long expression', () => {
  assert.throws(() => renderLatexToPng('x'.repeat(2001)), /too long/);
});

test('reports a LaTeX parse error instead of throwing raw', () => {
  assert.throws(() => renderLatexToPng('\\frac{1}'), LatexRenderError);
});
