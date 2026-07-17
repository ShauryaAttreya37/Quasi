import test from 'node:test';
import assert from 'node:assert/strict';

import { extractMathCards } from '../src/mathCards.js';
import { buildMessagesForUser } from '../src/persona.js';

test('fenced TeX is rendered to a PNG attachment instead of sent raw', () => {
  const output = extractMathCards('Result:\n```tex\n\\frac{1}{2}\n```');
  assert.equal(output.files.length, 1);
  assert.equal(output.files[0].name, 'quasi-equation-1.png');
  assert.ok(Buffer.isBuffer(output.files[0].attachment));
  assert.doesNotMatch(output.content, /```tex/);
});

test('bounded conversation messages are inserted before the current message', () => {
  const contextMessages = [
    { role: 'user', content: 'Ada: We are discussing Postgres.' },
    { role: 'assistant', content: 'It fits the workload.' }
  ];
  const messages = buildMessagesForUser('Ada', 'What about scaling?', { contextMessages });
  assert.deepEqual(messages.slice(1, 3), contextMessages);
  assert.match(messages.at(-1).content, /What about scaling/);
});
