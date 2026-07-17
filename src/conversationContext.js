const DEFAULT_MAX_MESSAGES = 10;
const DEFAULT_MAX_CHARS = 4000;
const DEFAULT_MAX_AGE_MINUTES = 30;
const MAX_CHARS_PER_MESSAGE = 900;

function displayName(message) {
  return message.member?.displayName || message.author?.globalName || message.author?.username || 'unknown';
}

function compactContent(content) {
  const compact = String(content ?? '')
    .replace(/<@!?\d+>/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();
  if (compact.length <= MAX_CHARS_PER_MESSAGE) return compact;
  return `${compact.slice(0, MAX_CHARS_PER_MESSAGE - 1)}…`;
}

function asArray(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (typeof collection.values === 'function') return [...collection.values()];
  return [];
}

function toContextMessage(message, clientUserId) {
  const content = compactContent(message.content);
  if (!content) return undefined;

  if (message.author?.id === clientUserId) return { role: 'assistant', content };
  if (message.author?.bot) return undefined;
  return { role: 'user', content: `${displayName(message)}: ${content}` };
}

/** Build bounded recent-chat context locally, without another model call. */
export async function collectConversationContext(message, clientUserId, options = {}) {
  const fetchMessages = message.channel?.messages?.fetch;
  if (typeof fetchMessages !== 'function') return [];

  const maxMessages = options.maxMessages || DEFAULT_MAX_MESSAGES;
  const maxChars = options.maxChars || DEFAULT_MAX_CHARS;
  const maxAgeMinutes = options.maxAgeMinutes || DEFAULT_MAX_AGE_MINUTES;
  const cutoff = Date.now() - maxAgeMinutes * 60_000;

  let fetched;
  try {
    fetched = await fetchMessages.call(message.channel.messages, { limit: Math.min(maxMessages * 2 + 1, 50) });
  } catch {
    return [];
  }

  const candidates = asArray(fetched)
    .filter((candidate) => candidate?.id !== message.id)
    .filter((candidate) => !candidate.createdTimestamp || candidate.createdTimestamp >= cutoff)
    .sort((left, right) => (left.createdTimestamp || 0) - (right.createdTimestamp || 0))
    .map((candidate) => toContextMessage(candidate, clientUserId))
    .filter(Boolean);

  const selected = [];
  let usedChars = 0;
  for (let index = candidates.length - 1; index >= 0 && selected.length < maxMessages; index -= 1) {
    const candidate = candidates[index];
    if (usedChars + candidate.content.length > maxChars) continue;
    selected.unshift(candidate);
    usedChars += candidate.content.length;
  }
  return selected;
}
