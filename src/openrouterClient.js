export class OpenRouterError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'OpenRouterError';
    this.status = options.status;
  }
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl).replace(/\/+$/u, '');
}

function readAssistantContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new OpenRouterError('OpenRouter returned an empty assistant response.');
  }
  return content.trim();
}

export function createOpenRouterClient(config, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') {
    throw new OpenRouterError('No fetch implementation is available. Use Node.js 18 or newer.');
  }

  const endpoint = `${normalizeBaseUrl(config.openRouterBaseUrl)}/chat/completions`;

  return {
    async chat(messages, options = {}) {
      const headers = {
        Authorization: `Bearer ${config.openRouterApiKey}`,
        'Content-Type': 'application/json',
        'X-Title': config.openRouterAppName || 'Quasi'
      };

      if (config.openRouterSiteUrl) {
        headers['HTTP-Referer'] = config.openRouterSiteUrl;
      }

      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: options.model || config.openRouterModelNormal,
          messages,
          temperature: options.temperature ?? 0.75,
          max_tokens: options.maxTokens ?? 900
        })
      });

      if (!response.ok) {
        const body = typeof response.text === 'function' ? await response.text() : '';
        throw new OpenRouterError(`OpenRouter request failed with ${response.status}: ${body}`, {
          status: response.status
        });
      }

      return readAssistantContent(await response.json());
    }
  };
}

