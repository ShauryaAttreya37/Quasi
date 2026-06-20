import test from 'node:test';
import assert from 'node:assert/strict';

import { splitDiscordMessage } from '../src/discordFormat.js';

test('returns a single trimmed chunk when content fits', () => {
  assert.deepEqual(splitDiscordMessage('  **Hello**\n', 2000), ['**Hello**']);
});

test('splits long markdown under the supplied limit', () => {
  const message = ['first paragraph', 'x'.repeat(90), 'last paragraph'].join('\n\n');
  const chunks = splitDiscordMessage(message, 50);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 50));
  assert.equal(chunks.at(0), 'first paragraph');
  assert.equal(chunks.at(-1), 'last paragraph');
});

test('hard-splits an oversized unbroken token', () => {
  const chunks = splitDiscordMessage('a'.repeat(125), 50);

  assert.deepEqual(chunks.map((chunk) => chunk.length), [50, 50, 25]);
});

