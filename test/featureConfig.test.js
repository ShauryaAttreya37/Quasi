import test from 'node:test';
import assert from 'node:assert/strict';

import { ConfigError, loadConfig } from '../src/config.js';

const required = {
  DISCORD_TOKEN: 'discord-token',
  OPENROUTER_API_KEY: 'openrouter-key'
};

test('rate limit and image input defaults are applied', () => {
  const config = loadConfig(required);
  assert.equal(config.rateLimitRequestsPerHour, 60);
  assert.equal(config.imageGenerationModel, 'google/gemini-2.5-flash-image');
  assert.equal(config.imageGenerationRequestsPer24Hours, 5);
  assert.equal(config.maxImagesPerRequest, 3);
});

test('rate limit and image caps are configurable and validated', () => {
  const config = loadConfig({
    ...required,
    QUASI_RATE_LIMIT_REQUESTS_PER_HOUR: '8',
    QUASI_IMAGE_GENERATION_REQUESTS_PER_24_HOURS: '7',
    QUASI_MAX_IMAGES_PER_REQUEST: '2'
  });
  assert.equal(config.rateLimitRequestsPerHour, 8);
  assert.equal(config.imageGenerationRequestsPer24Hours, 7);
  assert.equal(config.maxImagesPerRequest, 2);

  assert.throws(
    () => loadConfig({ ...required, QUASI_RATE_LIMIT_REQUESTS_PER_HOUR: '0' }),
    (error) => error instanceof ConfigError && error.message.includes('QUASI_RATE_LIMIT_REQUESTS_PER_HOUR')
  );
  assert.throws(
    () => loadConfig({ ...required, QUASI_IMAGE_GENERATION_REQUESTS_PER_24_HOURS: '0' }),
    (error) =>
      error instanceof ConfigError &&
      error.message.includes('QUASI_IMAGE_GENERATION_REQUESTS_PER_24_HOURS')
  );
  assert.throws(
    () => loadConfig({ ...required, QUASI_MAX_IMAGES_PER_REQUEST: '5' }),
    (error) => error instanceof ConfigError && error.message.includes('QUASI_MAX_IMAGES_PER_REQUEST')
  );
});
