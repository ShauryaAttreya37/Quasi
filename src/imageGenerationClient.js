export class ImageGenerationError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ImageGenerationError';
    this.status = options.status;
  }
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl).replace(/\/+$/u, '');
}

async function readJsonOrText(response) {
  if (typeof response.text === 'function') {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { rawText: text };
    }
  }

  if (typeof response.json === 'function') return response.json();
  return {};
}

function fileDetails(mediaType) {
  switch (String(mediaType || 'image/png').toLowerCase()) {
    case 'image/png':
      return { mediaType: 'image/png', extension: 'png' };
    case 'image/jpeg':
      return { mediaType: 'image/jpeg', extension: 'jpg' };
    case 'image/webp':
      return { mediaType: 'image/webp', extension: 'webp' };
    default:
      throw new ImageGenerationError(`Provider returned an unsupported image type: ${mediaType}`);
  }
}

export function createOpenRouterImageClient(config, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') {
    throw new ImageGenerationError('No fetch implementation is available. Use Node.js 18 or newer.');
  }

  const endpoint = `${normalizeBaseUrl(config.openRouterBaseUrl)}/images`;

  return {
    async generate(prompt, options = {}) {
      if (!config.openRouterApiKey) {
        throw new ImageGenerationError('OPENROUTER_API_KEY is required for image generation.');
      }

      const body = {
        model: options.model || config.imageGenerationModel,
        prompt: String(prompt).trim(),
        n: 1
      };
      if (options.aspectRatio) body.aspect_ratio = options.aspectRatio;

      const headers = {
        Authorization: `Bearer ${config.openRouterApiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Title': config.openRouterAppName || 'Quasi'
      };
      if (config.openRouterSiteUrl) headers['HTTP-Referer'] = config.openRouterSiteUrl;

      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      const payload = await readJsonOrText(response);

      if (!response.ok) {
        throw new ImageGenerationError(
          `OpenRouter image request failed with ${response.status}: ${payload.rawText || JSON.stringify(payload)}`,
          { status: response.status }
        );
      }

      const generated = payload?.data?.[0];
      if (typeof generated?.b64_json !== 'string' || generated.b64_json.length === 0) {
        throw new ImageGenerationError('OpenRouter returned no generated image.');
      }

      const buffer = Buffer.from(generated.b64_json, 'base64');
      if (buffer.length === 0) {
        throw new ImageGenerationError('OpenRouter returned an empty generated image.');
      }

      return {
        buffer,
        ...fileDetails(generated.media_type),
        usage: payload.usage
      };
    }
  };
}
