function hasDirectMention(message, clientUserId) {
  return Boolean(message.mentions?.users?.has?.(clientUserId));
}

async function isReplyToClient(message, clientUserId) {
  if (!message.reference?.messageId || typeof message.fetchReference !== 'function') {
    return false;
  }

  try {
    const referenced = await message.fetchReference();
    return referenced?.author?.id === clientUserId;
  } catch {
    return false;
  }
}

export async function getMessageResponseDecision(message, clientUserId, config = {}) {
  if (!message) return { respond: false, reason: 'missing_message' };
  if (!clientUserId) return { respond: false, reason: 'missing_client_user' };
  if (message.author?.bot) return { respond: false, reason: 'bot_author' };
  if (!message.content?.trim()) return { respond: false, reason: 'empty_content' };

  if (hasDirectMention(message, clientUserId)) {
    return { respond: true, reason: 'direct_mention' };
  }

  if (await isReplyToClient(message, clientUserId)) {
    return { respond: true, reason: 'reply_to_quasi' };
  }

  if (config.dedicatedChannelId && message.channelId === config.dedicatedChannelId) {
    return { respond: false, reason: 'ambient_disabled' };
  }

  return { respond: false, reason: 'not_addressed_to_quasi' };
}

export async function shouldRespondToMessage(message, clientUserId, config = {}) {
  const decision = await getMessageResponseDecision(message, clientUserId, config);
  return decision.respond;
}
