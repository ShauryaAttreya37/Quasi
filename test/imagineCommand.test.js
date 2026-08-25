import test from 'node:test';
import assert from 'node:assert/strict';

import { data, execute } from '../src/commands/imagine.js';

function makeInteraction(values = {}) {
  const calls = { deferred: false, replies: [], edits: [] };
  return {
    calls,
    user: { id: values.userId || 'user-1' },
    options: {
      getString(name) {
        if (name === 'prompt') return values.prompt ?? 'a quiet city at dusk';
        if (name === 'aspect_ratio') return values.aspectRatio || null;
        return null;
      }
    },
    deferReply: async () => {
      calls.deferred = true;
    },
    reply: async (payload) => {
      calls.replies.push(payload);
    },
    editReply: async (payload) => {
      calls.edits.push(payload);
    }
  };
}

const config = { imageGenerationRequestsPer24Hours: 5 };

test('/imagine exposes prompt and aspect-ratio options', () => {
  const command = data.toJSON();
  assert.equal(command.name, 'imagine');
  assert.deepEqual(command.options.map((option) => option.name), ['prompt', 'aspect_ratio']);
});

test('/imagine rejects a blank prompt without using quota', async () => {
  const interaction = makeInteraction({ prompt: '   ' });
  let consumed = false;

  await execute(interaction, {
    config,
    imageGenerator: {},
    imageRateLimiter: { consume: () => { consumed = true; } }
  });

  assert.equal(consumed, false);
  assert.equal(interaction.calls.replies.length, 1);
  assert.match(interaction.calls.replies[0].content, /non-empty image prompt/);
});

test('/imagine generates and attaches one image', async () => {
  const interaction = makeInteraction({ aspectRatio: '16:9' });
  let request;
  const imageGenerator = {
    generate: async (prompt, options) => {
      request = { prompt, options };
      return { buffer: Buffer.from('image'), extension: 'png', mediaType: 'image/png' };
    }
  };

  await execute(interaction, {
    config,
    imageGenerator,
    imageRateLimiter: { consume: () => ({ allowed: true, remaining: 4, retryAfterMs: 0 }) }
  });

  assert.deepEqual(request, {
    prompt: 'a quiet city at dusk',
    options: { aspectRatio: '16:9' }
  });
  assert.equal(interaction.calls.deferred, true);
  assert.equal(interaction.calls.edits.length, 1);
  assert.equal(interaction.calls.edits[0].files.length, 1);
  assert.equal(interaction.calls.edits[0].embeds.length, 1);
});

test('/imagine rejects a sixth generation before calling OpenRouter', async () => {
  const interaction = makeInteraction();
  let generated = false;

  await execute(interaction, {
    config,
    imageGenerator: { generate: async () => { generated = true; } },
    imageRateLimiter: {
      consume: () => ({ allowed: false, remaining: 0, retryAfterMs: 2 * 60 * 60 * 1000 })
    }
  });

  assert.equal(generated, false);
  assert.equal(interaction.calls.deferred, false);
  assert.equal(interaction.calls.replies.length, 1);
  assert.match(interaction.calls.replies[0].content, /5 images\/24 hours/);
  assert.match(interaction.calls.replies[0].content, /2 hours/);
});
