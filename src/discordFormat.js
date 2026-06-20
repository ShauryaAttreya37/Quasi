export const DISCORD_REPLY_LIMIT = 1900;

function hardSplit(text, maxLength) {
  const chunks = [];
  for (let index = 0; index < text.length; index += maxLength) {
    chunks.push(text.slice(index, index + maxLength));
  }
  return chunks;
}

export function splitDiscordMessage(markdown, maxLength = DISCORD_REPLY_LIMIT) {
  const text = String(markdown ?? '').trim();
  if (!text) return [];
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let current = '';

  for (const paragraph of text.split(/\n{2,}/u)) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (trimmed.length > maxLength) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      chunks.push(...hardSplit(trimmed, maxLength));
      continue;
    }

    const next = current ? `${current}\n\n${trimmed}` : trimmed;
    if (next.length <= maxLength) {
      current = next;
    } else {
      chunks.push(current);
      current = trimmed;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

