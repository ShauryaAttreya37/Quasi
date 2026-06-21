import test from 'node:test';
import assert from 'node:assert/strict';

import { formatMathCards } from '../src/mathCards.js';

test('formatMathCards converts inline math into visible equation cards', () => {
  const output = formatMathCards('Energy is $E = mc^2$ in relativity.');

  assert.equal(
    output,
    [
      'Energy is',
      '',
      '**Equation card: Equation 1**',
      '```tex',
      'E = mc^2',
      '```',
      '',
      'in relativity.'
    ].join('\n')
  );
});

test('formatMathCards converts display math into visible equation cards', () => {
  const output = formatMathCards('Use $$F = ma$$ when mass is constant.');

  assert.match(output, /\*\*Equation card: Equation 1\*\*/);
  assert.match(output, /```tex\nF = ma\n```/);
  assert.doesNotMatch(output, /\$\$/);
});

test('formatMathCards leaves fenced code blocks unchanged', () => {
  const input = ['```js', "const price = '$5';", '```', 'Then $x = 1$.'].join('\n');
  const output = formatMathCards(input);

  assert.match(output, /const price = '\$5';/);
  assert.match(output, /\*\*Equation card: Equation 1\*\*/);
});
