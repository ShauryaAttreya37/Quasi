import test from 'node:test';
import assert from 'node:assert/strict';

import { createDailyRateLimiter, createHourlyRateLimiter } from '../src/rateLimiter.js';

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

test('daily limiter allows five generations per user in a rolling 24-hour window', () => {
  let timestamp = 10_000;
  const limiter = createDailyRateLimiter({ maxRequests: 5, now: () => timestamp });

  for (let index = 0; index < 5; index += 1) {
    assert.equal(limiter.consume('user-a').allowed, true);
  }
  const denied = limiter.consume('user-a');
  assert.equal(denied.allowed, false);
  assert.equal(denied.retryAfterMs, 24 * 60 * 60 * 1000);

  timestamp += 24 * 60 * 60 * 1000;
  assert.equal(limiter.consume('user-a').allowed, true);
});
