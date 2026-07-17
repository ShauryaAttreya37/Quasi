import test from 'node:test';
import assert from 'node:assert/strict';

import { collectConversationContext } from '../src/conversationContext.js';

function makeMessage(overrides = {}) {
  return {
    id: overrides.id || 'message',
    content: overrides.content || '',
    createdTimestamp: overrides.createdTimestamp || Date.now(),
    author: overrides.author || { id: 'user', username: 'User', bot: false },
    member: overrides.member
  };
}

test('collectConversationContext returns recent human and Quasi messages in order', async () => {
  const recent = [
    makeMessage({ id: '1', content: 'We are choosing a database', author: { id: 'a', username: 'Ada', bot: false } }),
    makeMessage({ id: '2', content: 'Postgres fits that workload.', author: { id: 'quasi', username: 'Quasi', bot: true } }),
    makeMessage({ id: '3', content: 'ignore me', author: { id: 'other-bot', username: 'Bot', bot: true } })
  ];
  const message = makeMessage({ id: 'current', content: '<@quasi> what about scaling?' });
  message.channel = { messages: { fetch: async () => new Map(recent.map((item) => [item.id, item])) } };

  assert.deepEqual(await collectConversationContext(message, 'quasi'), [
    { role: 'user', content: 'Ada: We are choosing a database' },
    { role: 'assistant', content: 'Postgres fits that workload.' }
  ]);
});

test('collectConversationContext respects the character budget and fails open', async () => {
  const message = makeMessage({ id: 'current', content: 'question' });
  message.channel = {
    messages: {
      fetch: async () => new Map([['1', makeMessage({ id: '1', content: 'x'.repeat(600) })]])
    }
  };
  assert.deepEqual(await collectConversationContext(message, 'quasi', { maxChars: 100 }), []);

  message.channel.messages.fetch = async () => {
    throw new Error('missing history permission');
  };
  assert.deepEqual(await collectConversationContext(message, 'quasi'), []);
});
