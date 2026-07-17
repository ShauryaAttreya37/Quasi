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

function isSupportedImage(attachment) {
  const contentType = String(attachment?.contentType || '').split(';', 1)[0].toLowerCase();
  if (SUPPORTED_IMAGE_TYPES.has(contentType)) return true;
  return IMAGE_EXTENSION_PATTERN.test(String(attachment?.name || attachment?.url || ''));
}

export function collectImageUrls(message, maxImages = 3) {
  return asArray(message?.attachments)
    .filter(isSupportedImage)
    .map((attachment) => attachment.url || attachment.proxyURL)
    .filter((url) => /^https:\/\//iu.test(String(url || '')))
    .slice(0, maxImages);
}
