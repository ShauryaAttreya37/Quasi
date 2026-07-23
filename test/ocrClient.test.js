import test from 'node:test';
import assert from 'node:assert/strict';

import { createOcrClient } from '../src/ocrClient.js';

test('extractTextFromImages downloads supported images and parses OCR text', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });

    if (url === 'https://cdn.discordapp.com/image.png') {
      return {
        ok: true,
        headers: { get: () => 'image/png' },
        arrayBuffer: async () => Buffer.from('fake-image').buffer
      };
    }

    assert.equal(url, 'https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2');
    const body = JSON.parse(options.body);
    assert.equal(body.input[0].type, 'image_url');
    assert.match(body.input[0].url, /^data:image\/png;base64,/u);
    assert.deepEqual(body.merge_levels, ['paragraph']);

    return {
      ok: true,
      text: async () =>
        JSON.stringify({
          data: [
            {
              index: 0,
              text_detections: [
                { text_prediction: { text: 'hello' } },
                { text_prediction: { text: 'world' } }
              ]
            }
          ]
        })
    };
  };

  const client = createOcrClient(
    {
      ocrEnabled: true,
      ocrApiKey: 'ocr-key',
      ocrEndpoint: 'https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2',
      ocrMergeLevel: 'paragraph',
      ocrTimeoutMs: 1000,
      ocrMaxImageBytes: 1024 * 1024
    },
    fetchImpl
  );

  const results = await client.extractTextFromImages([
    { url: 'https://cdn.discordapp.com/image.png', contentType: 'image/png', name: 'image.png' }
  ]);

  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer ocr-key');
  assert.equal(results[0].text, 'hello\nworld');
});

test('extractTextFromImages skips OCR-unsupported image formats', async () => {
  const client = createOcrClient(
    {
      ocrEnabled: true,
      ocrApiKey: 'ocr-key',
      ocrEndpoint: 'https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2',
      ocrMergeLevel: 'paragraph',
      ocrTimeoutMs: 1000,
      ocrMaxImageBytes: 1024 * 1024
    },
    async () => ({
      ok: true,
      headers: { get: () => 'image/webp' },
      arrayBuffer: async () => Buffer.from('fake-image').buffer
    })
  );

  assert.deepEqual(
    await client.extractTextFromImages([
      { url: 'https://cdn.discordapp.com/image.webp', contentType: 'image/webp', name: 'image.webp' }
    ]),
    []
  );
});
