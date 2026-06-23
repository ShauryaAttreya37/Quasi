import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';

import { renderPlot3d, Plot3dError } from '../plot3d.js';

const PLOT_COLOR = 0x5865f2;
const CMAP_CHOICES = ['viridis', 'plasma', 'inferno', 'magma', 'cividis', 'turbo', 'coolwarm'];

export const data = new SlashCommandBuilder()
  .setName('plot3d')
  .setDescription('Render a 3D plot.')
  .addSubcommand((sub) =>
    sub
      .setName('surface')
      .setDescription('Plot a surface z = f(x, y).')
      .addStringOption((o) =>
        o
          .setName('expression')
          .setDescription('f(x, y), e.g. sin(sqrt(x**2 + y**2))')
          .setRequired(true)
          .setMaxLength(300)
      )
      .addNumberOption((o) => o.setName('xmin').setDescription('x min (default -5)'))
      .addNumberOption((o) => o.setName('xmax').setDescription('x max (default 5)'))
      .addNumberOption((o) => o.setName('ymin').setDescription('y min (default -5)'))
      .addNumberOption((o) => o.setName('ymax').setDescription('y max (default 5)'))
      .addStringOption((o) => {
        o.setName('colormap').setDescription('Matplotlib colormap (default viridis)');
        for (const c of CMAP_CHOICES) o.addChoices({ name: c, value: c });
        return o;
      })
  )
  .addSubcommand((sub) =>
    sub
      .setName('curve')
      .setDescription('Plot a parametric curve (x(t), y(t), z(t)).')
      .addStringOption((o) =>
        o.setName('x').setDescription('x(t), e.g. cos(t)').setRequired(true).setMaxLength(300)
      )
      .addStringOption((o) =>
        o.setName('y').setDescription('y(t), e.g. sin(t)').setRequired(true).setMaxLength(300)
      )
      .addStringOption((o) =>
        o.setName('z').setDescription('z(t), e.g. t/3').setRequired(true).setMaxLength(300)
      )
      .addNumberOption((o) => o.setName('tmin').setDescription('t min (default 0)'))
      .addNumberOption((o) => o.setName('tmax').setDescription('t max (default 6.283)'))
  );

function buildJob(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'surface') {
    const expr = interaction.options.getString('expression', true);
    return {
      job: {
        mode: 'surface',
        expr,
        xrange: [interaction.options.getNumber('xmin') ?? -5, interaction.options.getNumber('xmax') ?? 5],
        yrange: [interaction.options.getNumber('ymin') ?? -5, interaction.options.getNumber('ymax') ?? 5],
        cmap: interaction.options.getString('colormap') ?? 'viridis'
      },
      caption: `z = ${expr}`
    };
  }

  const x = interaction.options.getString('x', true);
  const y = interaction.options.getString('y', true);
  const z = interaction.options.getString('z', true);
  return {
    job: {
      mode: 'line',
      x,
      y,
      z,
      trange: [interaction.options.getNumber('tmin') ?? 0, interaction.options.getNumber('tmax') ?? 2 * Math.PI],
      title: 'parametric curve'
    },
    caption: `(${x}, ${y}, ${z})`
  };
}

export async function execute(interaction, { config } = {}) {
  await interaction.deferReply();

  const { job, caption } = buildJob(interaction);

  try {
    const { buffer } = await renderPlot3d(job, {
      pythonBin: config?.pythonBin,
      timeoutMs: config?.plotTimeoutMs
    });
    const attachment = new AttachmentBuilder(buffer, { name: 'plot3d.png' });
    const embed = new EmbedBuilder()
      .setColor(PLOT_COLOR)
      .setImage('attachment://plot3d.png')
      .setFooter({ text: caption.slice(0, 2048) });

    await interaction.editReply({ embeds: [embed], files: [attachment] });
  } catch (error) {
    const message = error instanceof Plot3dError ? error.message : 'Could not generate that plot.';
    await interaction.editReply({ content: `❌ ${message}` });
  }
}
