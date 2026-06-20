import test from 'node:test';
import assert from 'node:assert/strict';

import { ConfigError, loadConfig } from '../src/config.js';

test('loadConfig requires Discord and OpenRouter secrets', () => {
  assert.throws(
    () => loadConfig({}),
    (error) =>
      error instanceof ConfigError &&
      error.message.includes('DISCORD_TOKEN') &&
      error.message.includes('OPENROUTER_API_KEY') &&
      error.message.includes('.env')
  );
});

test('loadConfig trims values and applies production defaults', () => {
  const config = loadConfig({
    DISCORD_TOKEN: ' discord-token ',
    OPENROUTER_API_KEY: ' openrouter-key ',
    QUASI_DEDICATED_CHANNEL_ID: ' 123456789012345678 '
  });

  assert.equal(config.discordToken, 'discord-token');
  assert.equal(config.openRouterApiKey, 'openrouter-key');
  assert.equal(config.openRouterModelNormal, 'google/gemma-4-31b-it:free');
  assert.equal(config.openRouterBaseUrl, 'https://openrouter.ai/api/v1');
  assert.equal(config.dedicatedChannelId, '123456789012345678');
  assert.equal(config.openRouterAppName, 'Quasi');
  assert.equal(config.logLevel, 'info');
});
