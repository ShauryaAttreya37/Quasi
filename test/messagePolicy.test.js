import test from 'node:test';
import assert from 'node:assert/strict';

import { getMessageResponseDecision, shouldRespondToMessage } from '../src/messagePolicy.js';

const clientUserId = 'bot-123';
const config = { dedicatedChannelId: 'dedicated-456' };

function makeMessage(overrides = {}) {
  return {
    author: { bot: false },
    content: 'hello',
    channelId: 'general-789',
    mentions: { users: new Map() },
    reference: null,
    ...overrides
  };
}

test('responds when directly mentioned', async () => {
  const message = makeMessage({
    mentions: { users: new Map([[clientUserId, { id: clientUserId }]]) }
  });

  assert.equal(await shouldRespondToMessage(message, clientUserId, config), true);
});

test('explains direct mention decisions', async () => {
  const message = makeMessage({
    mentions: { users: new Map([[clientUserId, { id: clientUserId }]]) }
  });

  assert.deepEqual(await getMessageResponseDecision(message, clientUserId, config), {
    respond: true,
    reason: 'direct_mention'
  });
});

test('responds when replying to Quasi message', async () => {
  const message = makeMessage({
    reference: { messageId: 'message-1' },
    fetchReference: async () => ({ author: { id: clientUserId } })
  });

  assert.equal(await shouldRespondToMessage(message, clientUserId, config), true);
});

test('ignores ordinary chatter in dedicated channel for v1', async () => {
  const message = makeMessage({ channelId: 'dedicated-456' });

  assert.equal(await shouldRespondToMessage(message, clientUserId, config), false);
  assert.deepEqual(await getMessageResponseDecision(message, clientUserId, config), {
    respond: false,
    reason: 'ambient_disabled'
  });
});

test('ignores bot and empty messages', async () => {
  assert.equal(await shouldRespondToMessage(makeMessage({ author: { bot: true } }), clientUserId, config), false);
  assert.equal(await shouldRespondToMessage(makeMessage({ content: '   ' }), clientUserId, config), false);
});
