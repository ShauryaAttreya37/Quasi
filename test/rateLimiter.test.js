import test from 'node:test';
import assert from 'node:assert/strict';

import { createHourlyRateLimiter } from '../src/rateLimiter.js';

test('limits each user independently within a rolling window', () => {
  let timestamp = 1_000;
  const limiter = createHourlyRateLimiter({
    maxRequests: 2,
    windowMs: 60_000,
    now: () => timestamp
  });

  assert.equal(limiter.consume('user-a').allowed, true);
  assert.equal(limiter.consume('user-a').allowed, true);
  const denied = limiter.consume('user-a');
  assert.equal(denied.allowed, false);
  assert.equal(denied.retryAfterMs, 60_000);
  assert.equal(limiter.consume('user-b').allowed, true);

  timestamp += 60_001;
  assert.equal(limiter.consume('user-a').allowed, true);
});
