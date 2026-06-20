import test from 'node:test';
import assert from 'node:assert/strict';

import { createOpenRouterClient, OpenRouterError } from '../src/openrouterClient.js';
import { buildSystemPrompt } from '../src/persona.js';

const config = {
  openRouterApiKey: 'secret-key',
  openRouterBaseUrl: 'https://openrouter.ai/api/v1',
  openRouterModelNormal: 'google/gemma-4-31b-it:free',
  openRouterSiteUrl: 'https://example.com',
  openRouterAppName: 'Quasi'
};

test('buildSystemPrompt defines Quasi and Discord markdown behavior', () => {
  const prompt = buildSystemPrompt();

  assert.match(prompt, /Quasi/);
  assert.match(prompt, /physics/i);
  assert.match(prompt, /Discord Markdown/i);
  assert.match(prompt, /not performatively nice/i);
  assert.match(prompt, /nonchalant/i);
  assert.match(prompt, /over-eager assistant energy/i);
});

test('chat sends OpenRouter chat completion request and returns assistant content', async () => {
  let captured;
  const fetchImpl = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: '**Sharp answer.**' } }] })
    };
  };

  const client = createOpenRouterClient(config, fetchImpl);
  const response = await client.chat([
    { role: 'system', content: 'system prompt' },
    { role: 'user', content: 'hello' }
  ]);

  assert.equal(response, '**Sharp answer.**');
  assert.equal(captured.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(captured.options.method, 'POST');
  assert.equal(captured.options.headers.Authorization, 'Bearer secret-key');
  assert.equal(captured.options.headers['HTTP-Referer'], 'https://example.com');
  assert.equal(captured.options.headers['X-Title'], 'Quasi');
  assert.equal(captured.body.model, 'google/gemma-4-31b-it:free');
  assert.deepEqual(captured.body.messages.at(-1), { role: 'user', content: 'hello' });
});

test('chat throws OpenRouterError on provider failure', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 429,
    text: async () => 'rate limited'
  });

  const client = createOpenRouterClient(config, fetchImpl);

  await assert.rejects(
    () => client.chat([{ role: 'user', content: 'hello' }]),
    (error) =>
      error instanceof OpenRouterError &&
      error.message.includes('429') &&
      error.message.includes('rate limited')
  );
});
