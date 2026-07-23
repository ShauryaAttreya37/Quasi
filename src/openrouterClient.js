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
    throw new OpenRouterError('Provider returned an empty assistant response.');
  }
  return content.trim();
}

function buildRequestBody(config, messages, options) {
  const body = {
    model: options.model || config.chatModelNormal || config.openRouterModelNormal,
    messages,
    temperature: options.temperature ?? 0.75,
    max_tokens: options.maxTokens ?? 900
  };

  const webSearchEnabled = options.webSearchEnabled ?? config.webSearchEnabled;
  if ((config.aiProvider || 'openrouter') === 'openrouter' && webSearchEnabled) {
    body.plugins = [
      {
        id: 'web',
        max_results: options.webSearchMaxResults || config.webSearchMaxResults || 3
      }
    ];
  }

  return body;
}

function readRequestId(payload) {
  return payload?.requestId || payload?.request_id || payload?.id;
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

async function pollStatus(fetchImpl, baseUrl, headers, requestId, options) {
  const maxAttempts = options.statusPollAttempts ?? 30;
  const delayMs = options.statusPollDelayMs ?? 1000;
  const statusUrl = `${normalizeBaseUrl(baseUrl)}/status/${encodeURIComponent(requestId)}`;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const response = await fetchImpl(statusUrl, { method: 'GET', headers });
    const payload = await readJsonOrText(response);
    if (response.status === 202) continue;
    if (!response.ok) {
      throw new OpenRouterError(`Provider status poll failed with ${response.status}: ${payload.rawText || JSON.stringify(payload)}`, {
        status: response.status
      });
    }
    return payload;
  }

  throw new OpenRouterError('Provider response is still pending after status polling.');
}

export function createOpenRouterClient(config, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== 'function') {
    throw new OpenRouterError('No fetch implementation is available. Use Node.js 18 or newer.');
  }

  const baseUrl = config.chatBaseUrl || config.openRouterBaseUrl;
  const endpoint = `${normalizeBaseUrl(baseUrl)}/chat/completions`;

  return {
    async chat(messages, options = {}) {
      const apiKey = config.chatApiKey || config.openRouterApiKey;
      const headers = {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      };

      if ((config.aiProvider || 'openrouter') === 'openrouter') {
        headers['X-Title'] = config.openRouterAppName || 'Quasi';
        if (config.openRouterSiteUrl) {
          headers['HTTP-Referer'] = config.openRouterSiteUrl;
        }
      }

      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(buildRequestBody(config, messages, options))
      });
      const payload = await readJsonOrText(response);

      if (response.status === 202) {
        const requestId = readRequestId(payload);
        if (!requestId) throw new OpenRouterError('Provider returned 202 without a requestId.', { status: 202 });
        return readAssistantContent(await pollStatus(fetchImpl, baseUrl, headers, requestId, options));
      }

      if (!response.ok) {
        throw new OpenRouterError(`Provider request failed with ${response.status}: ${payload.rawText || JSON.stringify(payload)}`, {
          status: response.status
        });
      }

      return readAssistantContent(payload);
    }
  };
}

