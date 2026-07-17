import { Client, GatewayIntentBits, MessageFlags, Partials } from 'discord.js';

import { extractMathCards } from './mathCards.js';
import { collectConversationContext } from './conversationContext.js';
import { splitDiscordMessage } from './discordFormat.js';
import { getMessageResponseDecision } from './messagePolicy.js';
import { createOpenRouterClient } from './openrouterClient.js';
import { buildMessagesForUser } from './persona.js';
import { commandMap } from './commands/index.js';
import { shouldUseWebSearch } from './webSearchPolicy.js';
import { collectImageUrls } from './imageInputs.js';
import { createHourlyRateLimiter } from './rateLimiter.js';

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

export async function sendMarkdownReply(message, markdown) {
  const { segments } = extractMathCards(markdown);
  let sent = false;

  async function send(payload) {
    const common = { flags: MessageFlags.SuppressEmbeds };
    if (!sent) {
      sent = true;
      await message.reply({ ...payload, ...common, allowedMentions: { repliedUser: false } });
      return;
    }
    await message.channel.send({ ...payload, ...common, allowedMentions: { parse: [] } });
  }

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const next = segments[index + 1];

    if (segment.type === 'text' && next?.type === 'equation') {
      const chunks = splitDiscordMessage(segment.content);
      for (const chunk of chunks.slice(0, -1)) await send({ content: chunk });
      await send({ content: chunks.at(-1) || next.content, files: [next.file] });
      index += 1;
      continue;
    }

    if (segment.type === 'equation') {
      await send({ content: segment.content, files: [segment.file] });
      continue;
    }

    for (const chunk of splitDiscordMessage(segment.content)) await send({ content: chunk });
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
  const rateLimiter = dependencies.rateLimiter || createHourlyRateLimiter({
    maxRequests: config.rateLimitRequestsPerHour
  });

  client.once('ready', () => {
    logger.info(`Quasi is online as ${client.user.tag}.`);
    if (config.dedicatedChannelId) {
      logger.info(`Dedicated channel configured: ${config.dedicatedChannelId}`);
    }
  });

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = commandMap.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, { config, logger });
    } catch (error) {
      logger.error(`Slash command "${interaction.commandName}" failed.`, error);
      const reply = { content: '❌ Command failed unexpectedly.' };
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(reply);
        } else {
          await interaction.reply({ ...reply, ephemeral: true });
        }
      } catch (replyError) {
        logger.error('Failed to report slash command error.', replyError);
      }
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


    const rateLimit = rateLimiter.consume(message.author?.id || 'unknown');
    if (!rateLimit.allowed) {
      const waitMinutes = Math.max(1, Math.ceil(rateLimit.retryAfterMs / 60_000));
      await message.reply({
        content:
          `You have hit Quasi's ${config.rateLimitRequestsPerHour} requests/hour limit. ` +
          `Try again in about ${waitMinutes} minute${waitMinutes === 1 ? '' : 's'}.`,
        flags: MessageFlags.SuppressEmbeds,
        allowedMentions: { repliedUser: false }
      });
      return;
    }
    try {
      await message.channel.sendTyping();
      const userContent = stripBotMention(message.content, clientUserId);
      const imageUrls = collectImageUrls(message, config.maxImagesPerRequest);
      const promptContent =
        userContent || (imageUrls.length > 0 ? 'Describe and respond to the attached image.' : message.content);
      const contextMessages = await collectConversationContext(message, clientUserId);
      const messages = buildMessagesForUser(getUserDisplayName(message), promptContent, {
        timeZone: config.timeZone,
        contextMessages,
        imageUrls
      });
      debugLog(config, logger, 'Sending message to OpenRouter.', {
        channelId: message.channelId,
        reason: decision.reason,
        contextMessages: contextMessages.length,
        imageCount: imageUrls.length
      });
      const reply = await openRouter.chat(messages, {
        webSearchEnabled: config.webSearchEnabled && shouldUseWebSearch(promptContent)
      });
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
