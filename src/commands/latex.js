import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';

import { renderLatexToPng, LatexRenderError } from '../latexRender.js';

const EQUATION_COLOR = 0x5865f2;

export const data = new SlashCommandBuilder()
  .setName('latex')
  .setDescription('Render a LaTeX expression to an image.')
  .addStringOption((option) =>
    option
      .setName('expression')
      .setDescription('LaTeX without surrounding $, e.g. \\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}')
      .setRequired(true)
      .setMaxLength(1000)
  )
  .addBooleanOption((option) =>
    option
      .setName('inline')
      .setDescription('Render in inline (text-size) mode instead of display mode.')
      .setRequired(false)
  );

export async function execute(interaction) {
  const expression = interaction.options.getString('expression', true);
  const display = interaction.options.getBoolean('inline') !== true;

  await interaction.deferReply();

  try {
    const { buffer } = renderLatexToPng(expression, { display });
    const attachment = new AttachmentBuilder(buffer, { name: 'equation.png' });
    const embed = new EmbedBuilder()
      .setColor(EQUATION_COLOR)
      .setImage('attachment://equation.png')
      .setFooter({ text: expression.slice(0, 2048) });

    await interaction.editReply({ embeds: [embed], files: [attachment] });
  } catch (error) {
    const message =
      error instanceof LatexRenderError ? error.message : 'Could not render that expression.';
    await interaction.editReply({ content: `❌ ${message}` });
  }
}
