import test from 'node:test';
import assert from 'node:assert/strict';

import { collectImageAttachments, collectImageUrls } from '../src/imageInputs.js';
import { buildMessagesForUser } from '../src/persona.js';

test('collectImageUrls accepts supported Discord image attachments only', () => {
  const attachments = new Map([
    ['1', { contentType: 'image/png', url: 'https://cdn.discordapp.com/a.png' }],
    ['2', { name: 'photo.webp', url: 'https://cdn.discordapp.com/photo.webp' }],
    ['3', { contentType: 'application/pdf', url: 'https://cdn.discordapp.com/a.pdf' }]
  ]);

  assert.deepEqual(collectImageUrls({ attachments }, 2), [
    'https://cdn.discordapp.com/a.png',
    'https://cdn.discordapp.com/photo.webp'
  ]);
});

test('buildMessagesForUser creates a multimodal user message with text first', () => {
  const messages = buildMessagesForUser('Ada', 'What is in this?', {
    imageUrls: ['https://cdn.discordapp.com/image.png']
  });

  assert.deepEqual(messages.at(-1).content, [
    { type: 'text', text: 'Discord user Ada said:\n\nWhat is in this?' },
    {
      type: 'image_url',
      image_url: { url: 'https://cdn.discordapp.com/image.png' }
    }
  ]);
});

test('collectImageAttachments preserves image metadata for OCR', () => {
  const attachments = new Map([
    ['1', { contentType: 'image/png; charset=binary', name: 'a.png', url: 'https://cdn.discordapp.com/a.png', size: 123 }]
  ]);

  assert.deepEqual(collectImageAttachments({ attachments }, 1), [
    {
      url: 'https://cdn.discordapp.com/a.png',
      proxyURL: undefined,
      name: 'a.png',
      contentType: 'image/png',
      size: 123
    }
  ]);
});
