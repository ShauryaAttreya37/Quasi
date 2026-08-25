const DEFAULT_MODEL = 'google/gemini-2.5-flash-lite';
const DEFAULT_NVIDIA_MODEL = 'moonshotai/kimi-k2.6';
const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_NVIDIA_OCR_ENDPOINT = 'https://ai.api.nvidia.com/v1/cv/nvidia/nemotron-ocr-v2';
const DEFAULT_APP_NAME = 'Quasi';
const DEFAULT_TIME_ZONE = 'America/Los_Angeles';
const DEFAULT_WEB_SEARCH_ENABLED = true;
const DEFAULT_WEB_SEARCH_MAX_RESULTS = 3;
const DEFAULT_LOG_LEVEL = 'info';
const DEFAULT_RATE_LIMIT_REQUESTS_PER_HOUR = 60;
const DEFAULT_IMAGE_GENERATION_MODEL = 'google/gemini-2.5-flash-image';
const DEFAULT_IMAGE_GENERATION_REQUESTS_PER_24_HOURS = 5;
const DEFAULT_MAX_IMAGES_PER_REQUEST = 3;
const DEFAULT_OCR_TIMEOUT_MS = 30000;
const DEFAULT_OCR_MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalClean(value) {
  const cleaned = clean(value);
  return cleaned.length > 0 ? cleaned : undefined;
}

function validateTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
  } catch {
    throw new ConfigError(`Invalid QUASI_TIME_ZONE: ${timeZone}`);
  }
}

function parseBoolean(value, defaultValue) {
  const cleaned = clean(value).toLowerCase();
  if (!cleaned) return defaultValue;
  if (['1', 'true', 'yes', 'on'].includes(cleaned)) return true;
  if (['0', 'false', 'no', 'off'].includes(cleaned)) return false;
  throw new ConfigError(`Invalid boolean value: ${value}`);
}

function parseWebSearchMaxResults(value) {
  const cleaned = clean(value);
  if (!cleaned) return DEFAULT_WEB_SEARCH_MAX_RESULTS;

  const parsed = Number.parseInt(cleaned, 10);
  if (!Number.isInteger(parsed) || String(parsed) !== cleaned || parsed < 1 || parsed > 10) {
    throw new ConfigError('Invalid QUASI_WEB_SEARCH_MAX_RESULTS: use an integer from 1 to 10.');
  }

  return parsed;
}

function parsePlotTimeout(value) {
  const cleaned = clean(value);
  if (!cleaned) return 15000;
  const parsed = Number.parseInt(cleaned, 10);
  if (!Number.isInteger(parsed) || String(parsed) !== cleaned || parsed < 1000 || parsed > 60000) {
    throw new ConfigError('Invalid QUASI_PLOT_TIMEOUT_MS: use an integer from 1000 to 60000.');
  }
  return parsed;
}

function parseBoundedInteger(value, defaultValue, name, minimum, maximum) {
  const cleaned = clean(value);
  if (!cleaned) return defaultValue;
  const parsed = Number.parseInt(cleaned, 10);
  if (!Number.isInteger(parsed) || String(parsed) !== cleaned || parsed < minimum || parsed > maximum) {
    throw new ConfigError(`Invalid ${name}: use an integer from ${minimum} to ${maximum}.`);
  }
  return parsed;
}

function parseProvider(value) {
  const provider = clean(value).toLowerCase() || 'openrouter';
  if (['openrouter', 'nvidia', 'openai-compatible'].includes(provider)) return provider;
  throw new ConfigError('Invalid QUASI_AI_PROVIDER: use openrouter, nvidia, or openai-compatible.');
}

function parseOcrMergeLevel(value) {
  const mergeLevel = clean(value).toLowerCase() || 'paragraph';
  if (['word', 'sentence', 'paragraph'].includes(mergeLevel)) return mergeLevel;
  throw new ConfigError('Invalid QUASI_OCR_MERGE_LEVEL: use word, sentence, or paragraph.');
}

export function loadConfig(env = process.env) {
  const discordToken = clean(env.DISCORD_TOKEN);
  const nvidiaApiKey = clean(env.NVIDIA_API_KEY);
  const aiProvider = parseProvider(env.QUASI_AI_PROVIDER);
  const genericAiApiKey = clean(env.QUASI_AI_API_KEY);
  const openRouterApiKey = clean(env.OPENROUTER_API_KEY);
  const openRouterBaseUrl = clean(env.OPENROUTER_BASE_URL) || DEFAULT_OPENROUTER_BASE_URL;
  const chatApiKey = genericAiApiKey || (aiProvider === 'nvidia' ? nvidiaApiKey : openRouterApiKey);
  const ocrApiKey = clean(env.QUASI_OCR_API_KEY) || clean(env.NVIDIA_OCR_API_KEY) || clean(env.NVIDIA_OCR);
  const ocrEnabled = parseBoolean(env.QUASI_OCR_ENABLED, Boolean(ocrApiKey));
  const timeZone = clean(env.QUASI_TIME_ZONE) || DEFAULT_TIME_ZONE;
  const webSearchEnabled = parseBoolean(env.QUASI_WEB_SEARCH_ENABLED, DEFAULT_WEB_SEARCH_ENABLED);
  const webSearchMaxResults = parseWebSearchMaxResults(env.QUASI_WEB_SEARCH_MAX_RESULTS);
  const missing = [];

  if (!discordToken) missing.push('DISCORD_TOKEN');
  if (!chatApiKey) missing.push(aiProvider === 'nvidia' ? 'NVIDIA_API_KEY' : 'OPENROUTER_API_KEY');
  if (ocrEnabled && !ocrApiKey) missing.push('QUASI_OCR_API_KEY or NVIDIA_OCR_API_KEY');

  if (missing.length > 0) {
    throw new ConfigError(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Create a .env file from .env.example; dotenv does not load .env.example at runtime.'
    );
  }

  validateTimeZone(timeZone);

  const chatModelNormal =
    clean(env.QUASI_AI_MODEL_NORMAL) ||
    (aiProvider === 'nvidia'
      ? clean(env.NVIDIA_MODEL_NORMAL) || DEFAULT_NVIDIA_MODEL
      : clean(env.OPENROUTER_MODEL_NORMAL) || DEFAULT_MODEL);
  const chatBaseUrl =
    clean(env.QUASI_AI_BASE_URL) ||
    (aiProvider === 'nvidia'
      ? clean(env.NVIDIA_BASE_URL) || DEFAULT_NVIDIA_BASE_URL
      : clean(env.OPENROUTER_BASE_URL) || DEFAULT_OPENROUTER_BASE_URL);

  return {
    discordToken,
    aiProvider,
    chatApiKey,
    chatModelNormal,
    chatBaseUrl,
    nvidiaApiKey: nvidiaApiKey || undefined,
    openRouterApiKey,
    openRouterModelNormal: chatModelNormal,
    openRouterBaseUrl,
    openRouterSiteUrl: optionalClean(env.OPENROUTER_SITE_URL),
    openRouterAppName: clean(env.OPENROUTER_APP_NAME) || DEFAULT_APP_NAME,
    imageGenerationModel:
      clean(env.OPENROUTER_IMAGE_GENERATION_MODEL) || DEFAULT_IMAGE_GENERATION_MODEL,
    imageGenerationRequestsPer24Hours: parseBoundedInteger(
      env.QUASI_IMAGE_GENERATION_REQUESTS_PER_24_HOURS,
      DEFAULT_IMAGE_GENERATION_REQUESTS_PER_24_HOURS,
      'QUASI_IMAGE_GENERATION_REQUESTS_PER_24_HOURS',
      1,
      100
    ),
    ocrEnabled,
    ocrApiKey: ocrApiKey || undefined,
    ocrEndpoint:
      clean(env.QUASI_OCR_ENDPOINT) || clean(env.NVIDIA_OCR_ENDPOINT) || DEFAULT_NVIDIA_OCR_ENDPOINT,
    ocrMergeLevel: parseOcrMergeLevel(env.QUASI_OCR_MERGE_LEVEL),
    ocrTimeoutMs: parseBoundedInteger(
      env.QUASI_OCR_TIMEOUT_MS,
      DEFAULT_OCR_TIMEOUT_MS,
      'QUASI_OCR_TIMEOUT_MS',
      1000,
      120000
    ),
    ocrMaxImageBytes: parseBoundedInteger(
      env.QUASI_OCR_MAX_IMAGE_BYTES,
      DEFAULT_OCR_MAX_IMAGE_BYTES,
      'QUASI_OCR_MAX_IMAGE_BYTES',
      1024,
      25 * 1024 * 1024
    ),
    dedicatedChannelId: optionalClean(env.QUASI_DEDICATED_CHANNEL_ID),
    discordClientId: optionalClean(env.DISCORD_CLIENT_ID),
    discordGuildId: optionalClean(env.DISCORD_GUILD_ID),
    pythonBin: clean(env.QUASI_PYTHON_BIN) || 'python3',
    plotTimeoutMs: parsePlotTimeout(env.QUASI_PLOT_TIMEOUT_MS),
    timeZone,
    webSearchEnabled,
    webSearchMaxResults,
    rateLimitRequestsPerHour: parseBoundedInteger(
      env.QUASI_RATE_LIMIT_REQUESTS_PER_HOUR,
      DEFAULT_RATE_LIMIT_REQUESTS_PER_HOUR,
      'QUASI_RATE_LIMIT_REQUESTS_PER_HOUR',
      1,
      1000
    ),
    maxImagesPerRequest: parseBoundedInteger(
      env.QUASI_MAX_IMAGES_PER_REQUEST,
      DEFAULT_MAX_IMAGES_PER_REQUEST,
      'QUASI_MAX_IMAGES_PER_REQUEST',
      1,
      4
    ),
    logLevel: clean(env.LOG_LEVEL) || DEFAULT_LOG_LEVEL
  };
}
