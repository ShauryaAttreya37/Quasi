const DEFAULT_MODEL = 'google/gemini-2.5-flash-lite';
const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_APP_NAME = 'Quasi';
const DEFAULT_TIME_ZONE = 'America/Los_Angeles';
const DEFAULT_LOG_LEVEL = 'info';

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

export function loadConfig(env = process.env) {
  const discordToken = clean(env.DISCORD_TOKEN);
  const openRouterApiKey = clean(env.OPENROUTER_API_KEY);
  const timeZone = clean(env.QUASI_TIME_ZONE) || DEFAULT_TIME_ZONE;
  const missing = [];

  if (!discordToken) missing.push('DISCORD_TOKEN');
  if (!openRouterApiKey) missing.push('OPENROUTER_API_KEY');

  if (missing.length > 0) {
    throw new ConfigError(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Create a .env file from .env.example; dotenv does not load .env.example at runtime.'
    );
  }

  validateTimeZone(timeZone);

  return {
    discordToken,
    openRouterApiKey,
    openRouterModelNormal: clean(env.OPENROUTER_MODEL_NORMAL) || DEFAULT_MODEL,
    openRouterBaseUrl: clean(env.OPENROUTER_BASE_URL) || DEFAULT_OPENROUTER_BASE_URL,
    openRouterSiteUrl: optionalClean(env.OPENROUTER_SITE_URL),
    openRouterAppName: clean(env.OPENROUTER_APP_NAME) || DEFAULT_APP_NAME,
    dedicatedChannelId: optionalClean(env.QUASI_DEDICATED_CHANNEL_ID),
    timeZone,
    logLevel: clean(env.LOG_LEVEL) || DEFAULT_LOG_LEVEL
  };
}
