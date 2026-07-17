import test from 'node:test';
import assert from 'node:assert/strict';

import { sendMarkdownReply } from '../src/bot.js';
import { LATEX_RENDER_THEME } from '../src/latexRender.js';
import { extractMathCards } from '../src/mathCards.js';

test('uses a Discord dark theme for rendered equations', () => {
  assert.deepEqual(LATEX_RENDER_THEME, {
    foreground: '#f2f3f5',
    background: '#2b2d31'
  });
});

test('preserves text-equation-text ordering as renderable segments', () => {
  const output = extractMathCards('Momentum:\n$$F = ma$$\nwhere mass is constant.');

  assert.deepEqual(output.segments.map((segment) => segment.type), [
    'text',
    'equation',
    'text'
  ]);
  assert.equal(output.segments[0].content, 'Momentum:');
  assert.equal(output.segments[2].content, 'where mass is constant.');
});

test('sends each equation with its relevant text instead of one attachment gallery', async () => {
  const sent = [];
  const message = {
    reply: async (payload) => sent.push(payload),
    channel: { send: async (payload) => sent.push(payload) }
  };

  await sendMarkdownReply(
    message,
    ['**Momentum**', '$$F = ma$$', 'For energy:', '$$E = mc^2$$', 'Both are useful.'].join('\n\n')
  );

  assert.equal(sent.length, 3);
  assert.equal(sent[0].content, '**Momentum**');
  assert.equal(sent[0].files.length, 1);
  assert.equal(sent[1].content, 'For energy:');
  assert.equal(sent[1].files.length, 1);
  assert.equal(sent[2].content, 'Both are useful.');
  assert.equal(sent[2].files, undefined);
  assert.ok(sent.every((payload) => !payload.files || payload.files.length === 1));
});
