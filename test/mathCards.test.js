import test from 'node:test';
import assert from 'node:assert/strict';

import { extractMathCards, formatMathCards } from '../src/mathCards.js';

test('extractMathCards turns real inline equations into Discord embeds', () => {
  const output = extractMathCards('Energy is $E = mc^2$ in relativity.');

  assert.equal(output.content, 'Energy is Equation 1 in relativity.');
  assert.deepEqual(output.embeds, [
    {
      title: 'Equation card: Equation 1',
      description: '```tex\nE = mc^2\n```',
      color: 0x5865f2
    }
  ]);
});

test('extractMathCards turns display equations into Discord embeds', () => {
  const output = extractMathCards('Use $$F = ma$$ when mass is constant.');

  assert.equal(output.content, 'Use Equation 1 when mass is constant.');
  assert.equal(output.embeds[0].title, 'Equation card: Equation 1');
  assert.equal(output.embeds[0].description, '```tex\nF = ma\n```');
});

test('extractMathCards does not shred tiny inline symbols in prose', () => {
  const output = extractMathCards('**Density** ($\\rho$) and velocity ($\\mathbf{u}$) matter.');

  assert.equal(output.content, '**Density** ($\\rho$) and velocity ($\\mathbf{u}$) matter.');
  assert.deepEqual(output.embeds, []);
});

test('extractMathCards leaves fenced code blocks unchanged', () => {
  const input = ['```js', "const price = '$5';", '```', 'Then $x = 1$.'].join('\n');
  const output = extractMathCards(input);

  assert.match(output.content, /const price = '\$5';/);
  assert.equal(output.embeds[0].description, '```tex\nx = 1\n```');
});

test('formatMathCards keeps markdown fallback for non-embed senders', () => {
  const output = formatMathCards('Energy is $E = mc^2$.');

  assert.match(output, /\*\*Equation card: Equation 1\*\*/);
  assert.match(output, /```tex\nE = mc\^2\n```/);
});
