import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldUseWebSearch } from '../src/webSearchPolicy.js';

test('web search is reserved for fresh facts and explicit lookup requests', () => {
  assert.equal(shouldUseWebSearch('what is the latest Node release?'), true);
  assert.equal(shouldUseWebSearch('search the web for a source'), true);
  assert.equal(shouldUseWebSearch('explain closures in JavaScript'), false);
  assert.equal(shouldUseWebSearch('hey, how are you?'), false);
});
