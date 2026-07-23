const SUPPORTED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif'
]);
const IMAGE_EXTENSION_PATTERN = /\.(?:png|jpe?g|webp|gif)(?:\?|$)/iu;

function asArray(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (typeof collection.values === 'function') return [...collection.values()];
  return [];
}

function normalizeContentType(contentType) {
  return String(contentType || '').split(';', 1)[0].toLowerCase();
}

function isSupportedImage(attachment) {
  const contentType = normalizeContentType(attachment?.contentType);
  if (SUPPORTED_IMAGE_TYPES.has(contentType)) return true;
  return IMAGE_EXTENSION_PATTERN.test(String(attachment?.name || attachment?.url || ''));
}

export function collectImageAttachments(message, maxImages = 3) {
  return asArray(message?.attachments)
    .filter(isSupportedImage)
    .map((attachment) => ({
      url: attachment.url || attachment.proxyURL,
      proxyURL: attachment.proxyURL,
      name: attachment.name,
      contentType: normalizeContentType(attachment.contentType),
      size: attachment.size
    }))
    .filter((attachment) => /^https:\/\//iu.test(String(attachment.url || '')))
    .slice(0, maxImages);
}

export function collectImageUrls(message, maxImages = 3) {
  return collectImageAttachments(message, maxImages).map((attachment) => attachment.url);
}
