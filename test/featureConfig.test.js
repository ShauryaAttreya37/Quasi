import test from 'node:test';
import assert from 'node:assert/strict';

import { ConfigError, loadConfig } from '../src/config.js';

const required = {
  DISCORD_TOKEN: 'discord-token',
  OPENROUTER_API_KEY: 'openrouter-key'
};

test('rate limit and image input defaults are conservative', () => {
  const config = loadConfig(required);
  assert.equal(config.rateLimitRequestsPerHour, 12);
  assert.equal(config.maxImagesPerRequest, 3);
});

test('rate limit and image caps are configurable and validated', () => {
  const config = loadConfig({
    ...required,
    QUASI_RATE_LIMIT_REQUESTS_PER_HOUR: '8',
    QUASI_MAX_IMAGES_PER_REQUEST: '2'
  });
  assert.equal(config.rateLimitRequestsPerHour, 8);
  assert.equal(config.maxImagesPerRequest, 2);

  assert.throws(
    () => loadConfig({ ...required, QUASI_RATE_LIMIT_REQUESTS_PER_HOUR: '0' }),
    (error) => error instanceof ConfigError && error.message.includes('QUASI_RATE_LIMIT_REQUESTS_PER_HOUR')
  );
  assert.throws(
    () => loadConfig({ ...required, QUASI_MAX_IMAGES_PER_REQUEST: '5' }),
    (error) => error instanceof ConfigError && error.message.includes('QUASI_MAX_IMAGES_PER_REQUEST')
  );
});
