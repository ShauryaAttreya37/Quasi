import { Client, GatewayIntentBits, Partials } from 'discord.js';

import { extractMathCards } from './mathCards.js';
import { splitDiscordMessage } from './discordFormat.js';
import { getMessageResponseDecision } from './messagePolicy.js';
import { createOpenRouterClient } from './openrouterClient.js';
import { buildMessagesForUser } from './persona.js';

const FALLBACK_REPLY =
  '**Quasi hit a provider snag.**\n\nTry again in a moment. Even distributed systems occasionally trip over their own shoelaces.';

function stripBotMention(content, clientUserId) {
  return String(content ?? '')
    .replace(new RegExp(`<@!?${clientUserId}>`, 'gu'), '')
    .trim();
}

function getUserDisplayName(message) {
  return message.member?.displayName || message.author?.globalName || message.author?.username || 'unknown';
}

function debugLog(config, logger, message, context = {}) {
  if (config.logLevel !== 'debug') return;
  logger.debug(message, context);
}

async function sendMarkdownReply(message, markdown) {
  const { content, embeds } = extractMathCards(markdown);
  const chunks = splitDiscordMessage(content);
  if (chunks.length === 0) return;

  await message.reply({
    content: chunks[0],
    embeds: embeds.slice(0, 10),
    allowedMentions: { repliedUser: false }
  });

  for (const chunk of chunks.slice(1)) {
    await message.channel.send({
      content: chunk,
      allowedMentions: { parse: [] }
    });
  }
}

export function createDiscordClient() {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
  });
}

export async function startBot(config, dependencies = {}) {
  const client = dependencies.client || createDiscordClient();
  const openRouter = dependencies.openRouter || createOpenRouterClient(config);
  const logger = dependencies.logger || console;

  client.once('ready', () => {
    logger.info(`Quasi is online as ${client.user.tag}.`);
    if (config.dedicatedChannelId) {
      logger.info(`Dedicated channel configured: ${config.dedicatedChannelId}`);
    }
  });

  client.on('messageCreate', async (message) => {
    const clientUserId = client.user?.id;
    if (!clientUserId) return;

    const decision = await getMessageResponseDecision(message, clientUserId, config);
    debugLog(config, logger, 'Message policy decision.', {
      reason: decision.reason,
      respond: decision.respond,
      channelId: message.channelId,
      authorId: message.author?.id,
      hasContent: Boolean(message.content?.trim())
    });

    if (!decision.respond) return;

    try {
      await message.channel.sendTyping();
      const userContent = stripBotMention(message.content, clientUserId);
      const messages = buildMessagesForUser(getUserDisplayName(message), userContent || message.content, {
        timeZone: config.timeZone
      });
      debugLog(config, logger, 'Sending message to OpenRouter.', {
        channelId: message.channelId,
        reason: decision.reason
      });
      const reply = await openRouter.chat(messages);
      await sendMarkdownReply(message, reply);
      debugLog(config, logger, 'Sent Quasi reply.', { channelId: message.channelId });
    } catch (error) {
      logger.error('Failed to generate or send Quasi reply.', error);
      try {
        await sendMarkdownReply(message, FALLBACK_REPLY);
      } catch (replyError) {
        logger.error('Failed to send fallback reply.', replyError);
      }
    }
  });

  await client.login(config.discordToken);
  return client;
}
