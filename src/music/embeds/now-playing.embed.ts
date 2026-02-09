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
      .setCustomId(`music/clear/${guildId}`)
      .setLabel('Clear Queue')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('\uD83D\uDDD1\uFE0F'),
  );

  return { embed, row };
}
