import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { Track } from '../interfaces/track.interface';

export function createNowPlayingEmbed(track: Track, guildId: string) {
  const embed = new EmbedBuilder()
    .setTitle('Now Playing')
    .setDescription(`[${track.title}](${track.url})`)
    .addFields(
      { name: 'Duration', value: track.duration, inline: true },
      { name: 'Requested by', value: track.requestedBy, inline: true },
    )
    .setThumbnail(track.thumbnail || null)
    .setColor(0x5865f2);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`music/pause-resume/${guildId}`)
      .setLabel('Pause')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('\u23F8\uFE0F'),
    new ButtonBuilder()
      .setCustomId(`music/skip/${guildId}`)
      .setLabel('Skip')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('\u23ED\uFE0F'),
    new ButtonBuilder()
      .setCustomId(`music/stop/${guildId}`)
      .setLabel('Stop')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('\u23F9\uFE0F'),
    new ButtonBuilder()
      .setCustomId(`music/queue/${guildId}`)
      .setLabel('Queue')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('\uD83D\uDCCB'),
  );

  return { embed, row };
}

export function createNowPlayingComponents(
  guildId: string,
  recommendations?: Track[],
): ActionRowBuilder<ButtonBuilder>[] {
  const controlRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`music/pause-resume/${guildId}`)
      .setLabel('Pause')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('\u23F8\uFE0F'),
    new ButtonBuilder()
      .setCustomId(`music/skip/${guildId}`)
      .setLabel('Skip')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('\u23ED\uFE0F'),
    new ButtonBuilder()
      .setCustomId(`music/stop/${guildId}`)
      .setLabel('Stop')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('\u23F9\uFE0F'),
    new ButtonBuilder()
      .setCustomId(`music/queue/${guildId}`)
      .setLabel('Queue')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('\uD83D\uDCCB'),
  );

  const rows: ActionRowBuilder<ButtonBuilder>[] = [controlRow];

  if (recommendations && recommendations.length > 0) {
    const recRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      recommendations.map((rec, i) =>
        new ButtonBuilder()
          .setCustomId(`music/rec/${guildId}/${i}`)
          .setLabel(rec.title.length > 80 ? rec.title.slice(0, 77) + '...' : rec.title)
          .setStyle(ButtonStyle.Secondary),
      ),
    );
    rows.push(recRow);
  }

  return rows;
}

export function createPlayedEmbed(track: Track) {
  const embed = new EmbedBuilder()
    .setTitle('Played')
    .setDescription(`[${track.title}](${track.url})`)
    .addFields(
      { name: 'Duration', value: track.duration, inline: true },
      { name: 'Requested by', value: track.requestedBy, inline: true },
    )
    .setColor(0x95a5a6);

  return { embed };
}
