const OCR_SUPPORTED_TYPES = new Set(['image/png', 'image/jpeg']);
const EXTENSION_TO_MIME = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg']
]);

export class OcrError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'OcrError';
    this.status = options.status;
  }
}

function extensionFromPath(path = '') {
  const cleanPath = String(path).split('?', 1)[0].toLowerCase();
  const match = cleanPath.match(/\.[a-z0-9]+$/u);
  return match?.[0] || '';
}

function inferMimeType(image, responseContentType) {
  const contentType = String(image?.contentType || responseContentType || '').split(';', 1)[0].toLowerCase();
  if (OCR_SUPPORTED_TYPES.has(contentType)) return contentType;
  return EXTENSION_TO_MIME.get(extensionFromPath(image?.name || image?.url)) || undefined;
}

function withTimeout(config) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.ocrTimeoutMs);
  return { controller, timeout };
}

async function fetchImageDataUrl(image, config, fetchImpl) {
  const { controller, timeout } = withTimeout(config);
  try {
    const response = await fetchImpl(image.url, { signal: controller.signal });
    if (!response.ok) {
      throw new OcrError(`Image download failed with ${response.status}.`, { status: response.status });
    }

    const mimeType = inferMimeType(image, response.headers?.get?.('content-type'));
    if (!mimeType) return undefined;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > config.ocrMaxImageBytes) {
      throw new OcrError(`Image is too large for OCR (${buffer.byteLength} bytes).`);
    }

    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  } finally {
    clearTimeout(timeout);
  }
}

function textFromDetection(detection) {
  if (typeof detection?.text_prediction?.text === 'string') return detection.text_prediction.text;
  if (typeof detection?.text === 'string') return detection.text;
  if (typeof detection?.content === 'string') return detection.content;
  return '';
}

function detectionsFromItem(item) {
  if (Array.isArray(item?.text_detections)) return item.text_detections;
  if (Array.isArray(item?.detections)) return item.detections;
  if (Array.isArray(item?.ocr)) return item.ocr;
  if (typeof item?.text === 'string') return [item];
  return [];
}

function normalizeOcrPayload(payload, expectedCount) {
  const data = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.output)
      ? payload.output
      : Array.isArray(payload?.predictions)
        ? payload.predictions
        : [];

  const results = new Array(expectedCount).fill(null).map((_, index) => ({ index, text: '' }));
  data.forEach((item, fallbackIndex) => {
    const index = Number.isInteger(item?.index) ? item.index : fallbackIndex;
    if (!results[index]) return;
    const texts = detectionsFromItem(item)
      .map(textFromDetection)
      .map((text) => text.trim())
      .filter(Boolean);
    results[index] = { index, text: [...new Set(texts)].join('\n') };
  });

  return results.filter((result) => result.text);
}

async function postOcr(dataUrls, config, fetchImpl) {
  const { controller, timeout } = withTimeout(config);
  try {
    const response = await fetchImpl(config.ocrEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.ocrApiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: dataUrls.map((url) => ({ type: 'image_url', url })),
        merge_levels: dataUrls.map(() => config.ocrMergeLevel || 'paragraph')
      }),
      signal: controller.signal
    });

    const text = typeof response.text === 'function' ? await response.text() : '';
    const payload = text ? JSON.parse(text) : await response.json();

    if (!response.ok) {
      throw new OcrError(`OCR request failed with ${response.status}: ${text || JSON.stringify(payload)}`, {
        status: response.status
      });
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

export function createOcrClient(config, fetchImpl = globalThis.fetch) {
  if (!config.ocrEnabled) {
    return { extractTextFromImages: async () => [] };
  }

  if (typeof fetchImpl !== 'function') {
    throw new OcrError('No fetch implementation is available. Use Node.js 18 or newer.');
  }

  return {
    async extractTextFromImages(images) {
      const eligibleImages = [];
      const dataUrls = [];

      for (const image of Array.isArray(images) ? images : []) {
        const dataUrl = await fetchImageDataUrl(image, config, fetchImpl);
        if (!dataUrl) continue;
        eligibleImages.push(image);
        dataUrls.push(dataUrl);
      }

      if (dataUrls.length === 0) return [];
      const payload = await postOcr(dataUrls, config, fetchImpl);
      return normalizeOcrPayload(payload, eligibleImages.length).map((result) => ({
        ...result,
        image: eligibleImages[result.index]
      }));
    }
  };
}
