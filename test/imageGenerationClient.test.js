import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createOpenRouterImageClient,
  ImageGenerationError
} from '../src/imageGenerationClient.js';

const config = {
  openRouterApiKey: 'secret-key',
  openRouterBaseUrl: 'https://openrouter.ai/api/v1/',
  openRouterSiteUrl: 'https://example.com',
  openRouterAppName: 'Quasi',
  imageGenerationModel: 'google/gemini-2.5-flash-image'
};

test('generate sends a Nano Banana image request and decodes the response', async () => {
  let captured;
  const imageBytes = Buffer.from('generated image');
  const fetchImpl = async (url, options) => {
    captured = { url, options, body: JSON.parse(options.body) };
    return {
      ok: true,
      text: async () =>
        JSON.stringify({
          data: [{ b64_json: imageBytes.toString('base64'), media_type: 'image/png' }],
          usage: { cost: 0.04 }
        })
    };
  };

  const client = createOpenRouterImageClient(config, fetchImpl);
  const result = await client.generate('a red panda astronaut', { aspectRatio: '16:9' });

  assert.equal(captured.url, 'https://openrouter.ai/api/v1/images');
  assert.equal(captured.options.method, 'POST');
  assert.equal(captured.options.headers.Authorization, 'Bearer secret-key');
  assert.equal(captured.options.headers['HTTP-Referer'], 'https://example.com');
  assert.equal(captured.options.headers['X-Title'], 'Quasi');
  assert.deepEqual(captured.body, {
    model: 'google/gemini-2.5-flash-image',
    prompt: 'a red panda astronaut',
    n: 1,
    aspect_ratio: '16:9'
  });
  assert.deepEqual(result.buffer, imageBytes);
  assert.equal(result.mediaType, 'image/png');
  assert.equal(result.extension, 'png');
  assert.deepEqual(result.usage, { cost: 0.04 });
});

test('generate reports provider errors without accepting an empty image', async () => {
  const failedClient = createOpenRouterImageClient(config, async () => ({
    ok: false,
    status: 429,
    text: async () => 'rate limited'
  }));
  await assert.rejects(
    () => failedClient.generate('prompt'),
    (error) => error instanceof ImageGenerationError && error.status === 429
  );

  const emptyClient = createOpenRouterImageClient(config, async () => ({
    ok: true,
    text: async () => JSON.stringify({ data: [] })
  }));
  await assert.rejects(
    () => emptyClient.generate('prompt'),
    (error) => error instanceof ImageGenerationError && error.message.includes('no generated image')
  );
});
