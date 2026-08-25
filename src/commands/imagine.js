import { AttachmentBuilder, EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';

import { ImageGenerationError } from '../imageGenerationClient.js';

const IMAGE_COLOR = 0xf5c542;
const ASPECT_RATIOS = [
  { name: 'Square (1:1)', value: '1:1' },
  { name: 'Landscape (16:9)', value: '16:9' },
  { name: 'Portrait (9:16)', value: '9:16' },
  { name: 'Landscape (4:3)', value: '4:3' },
  { name: 'Portrait (3:4)', value: '3:4' }
];

export const data = new SlashCommandBuilder()
  .setName('imagine')
  .setDescription('Generate an image with Nano Banana.')
  .addStringOption((option) =>
    option
      .setName('prompt')
      .setDescription('Describe the image you want to generate.')
      .setRequired(true)
      .setMaxLength(2000)
  )
  .addStringOption((option) => {
    option
      .setName('aspect_ratio')
      .setDescription('Output shape (the model chooses when omitted).')
      .setRequired(false);
    for (const choice of ASPECT_RATIOS) option.addChoices(choice);
    return option;
  });

export async function execute(interaction, { config, logger, imageGenerator, imageRateLimiter } = {}) {
  const prompt = interaction.options.getString('prompt', true).trim();
  const aspectRatio = interaction.options.getString('aspect_ratio');
  if (!prompt) {
    await interaction.reply({
      content: 'Give Quasi a non-empty image prompt.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const userId = interaction.user?.id || 'unknown';
  const quota = imageRateLimiter.consume(userId);

  if (!quota.allowed) {
    const waitHours = Math.max(1, Math.ceil(quota.retryAfterMs / (60 * 60 * 1000)));
    await interaction.reply({
      content:
        `You have hit Quasi's ${config.imageGenerationRequestsPer24Hours} images/24 hours limit. ` +
        `Try again in about ${waitHours} hour${waitHours === 1 ? '' : 's'}.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply();

  try {
    const image = await imageGenerator.generate(prompt, { aspectRatio });
    const fileName = `quasi-nano-banana.${image.extension}`;
    const attachment = new AttachmentBuilder(image.buffer, { name: fileName });
    const remaining = `${quota.remaining} generation${quota.remaining === 1 ? '' : 's'} left in your rolling 24-hour window`;
    const embed = new EmbedBuilder()
      .setColor(IMAGE_COLOR)
      .setTitle('Nano Banana')
      .setImage(`attachment://${fileName}`)
      .setFooter({ text: `${prompt.slice(0, 1900)} • ${remaining}` });

    await interaction.editReply({ embeds: [embed], files: [attachment] });
  } catch (error) {
    logger?.error('Nano Banana image generation failed.', error);
    const message =
      error instanceof ImageGenerationError && error.status === 400
        ? 'OpenRouter rejected that image request. Try a different prompt or aspect ratio.'
        : 'Could not generate that image right now. Try again later.';
    await interaction.editReply({ content: `❌ ${message}` });
  }
}
