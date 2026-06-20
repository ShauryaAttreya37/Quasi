import 'dotenv/config';

import { loadConfig } from './src/config.js';
import { startBot } from './src/bot.js';

try {
  const config = loadConfig();
  await startBot(config);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

