import test from 'node:test';
import assert from 'node:assert/strict';

import { createOpenRouterClient, OpenRouterError } from '../src/openrouterClient.js';
import { buildMessagesForUser, buildSystemPrompt, formatCurrentDateContext } from '../src/persona.js';

const config = {
  openRouterApiKey: 'secret-key',
  openRouterBaseUrl: 'https://openrouter.ai/api/v1',
  openRouterModelNormal: 'google/gemini-2.5-flash-lite',
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

test('buildSystemPrompt locks Quasi to friend roleplay and allows emojis', () => {
  const prompt = buildSystemPrompt();

  assert.match(prompt, /only roleplay as the user'?s friend/i);
  assert.match(prompt, /training data/i);
  assert.match(prompt, /ignore/i);
  assert.match(prompt, /emojis/i);
  assert.match(prompt, /Do not claim to expose/i);
});

test('formatCurrentDateContext gives the model the real current date and time', () => {
  const context = formatCurrentDateContext(new Date('2026-06-21T03:30:00.000Z'), 'America/Los_Angeles');

  assert.match(context, /Current real-world date and time:/);
  assert.match(context, /Saturday, 20 June 2026/);
  assert.match(context, /20:30/);
  assert.match(context, /America\/Los_Angeles/);
});

test('buildMessagesForUser injects current date context into the system message', () => {
  const messages = buildMessagesForUser('Shaurya', 'what year is it?', {
    now: new Date('2026-06-21T03:30:00.000Z'),
    timeZone: 'America/Los_Angeles'
  });

  assert.match(messages[0].content, /Current real-world date and time:/);
  assert.match(messages[0].content, /Saturday, 20 June 2026/);
  assert.match(messages[0].content, /answer date, time, day, and year questions from this runtime context/i);
  assert.deepEqual(messages[1], {
    role: 'user',
    content: 'Discord user Shaurya said:\n\nwhat year is it?'
  });
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
  assert.equal(captured.body.model, 'google/gemini-2.5-flash-lite');
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
