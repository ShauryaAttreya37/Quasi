import 'dotenv/config';

import { REST, Routes } from 'discord.js';

import { loadConfig } from '../src/config.js';
import { commands } from '../src/commands/index.js';

// Registers Quasi's slash commands with Discord.
//   node scripts/register-commands.js          -> guild-scoped (instant) if DISCORD_GUILD_ID set, else global
//   node scripts/register-commands.js --global -> force global (can take ~1h to appear)
async function main() {
  const config = loadConfig();
  if (!config.discordClientId) {
    throw new Error('DISCORD_CLIENT_ID is required to register commands. Add it to your .env.');
  }

  const forceGlobal = process.argv.includes('--global');
  const body = commands.map((command) => command.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(config.discordToken);

  const useGuild = config.discordGuildId && !forceGlobal;
  const route = useGuild
    ? Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId)
    : Routes.applicationCommands(config.discordClientId);

  const result = await rest.put(route, { body });
  const scope = useGuild ? `guild ${config.discordGuildId}` : 'global';
  console.log(`Registered ${result.length} command(s) (${scope}): ${result.map((c) => '/' + c.name).join(', ')}`);
  if (!useGuild) {
    console.log('Global commands may take up to an hour to propagate.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
