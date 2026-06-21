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
  assert.equal(config.openRouterModelNormal, 'google/gemini-2.5-flash-lite');
  assert.equal(config.openRouterBaseUrl, 'https://openrouter.ai/api/v1');
  assert.equal(config.dedicatedChannelId, '123456789012345678');
  assert.equal(config.openRouterAppName, 'Quasi');
  assert.equal(config.timeZone, 'America/Los_Angeles');
  assert.equal(config.webSearchEnabled, true);
  assert.equal(config.webSearchMaxResults, 3);
  assert.equal(config.logLevel, 'info');
});

test('loadConfig validates configured time zone', () => {
  assert.throws(
    () =>
      loadConfig({
        DISCORD_TOKEN: 'discord-token',
        OPENROUTER_API_KEY: 'openrouter-key',
        QUASI_TIME_ZONE: 'not-a-time-zone'
      }),
    (error) => error instanceof ConfigError && error.message.includes('QUASI_TIME_ZONE')
  );
});

test('loadConfig parses web search controls', () => {
  const config = loadConfig({
    DISCORD_TOKEN: 'discord-token',
    OPENROUTER_API_KEY: 'openrouter-key',
    QUASI_WEB_SEARCH_ENABLED: 'false',
    QUASI_WEB_SEARCH_MAX_RESULTS: '1'
  });

  assert.equal(config.webSearchEnabled, false);
  assert.equal(config.webSearchMaxResults, 1);
});

test('loadConfig validates web search max results', () => {
  assert.throws(
    () =>
      loadConfig({
        DISCORD_TOKEN: 'discord-token',
        OPENROUTER_API_KEY: 'openrouter-key',
        QUASI_WEB_SEARCH_MAX_RESULTS: '0'
      }),
    (error) => error instanceof ConfigError && error.message.includes('QUASI_WEB_SEARCH_MAX_RESULTS')
  );
});
