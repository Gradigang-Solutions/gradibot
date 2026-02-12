import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { GuildQueue } from '../interfaces/guild-queue.interface';

export function createQueueEmbed(queue: GuildQueue, guildId: string) {
  const embed = new EmbedBuilder()
    .setTitle('Music Queue')
    .setColor(0x5865f2);

  if (queue.currentTrack) {
    embed.addFields({
      name: 'Now Playing',
      value: `[${queue.currentTrack.title}](${queue.currentTrack.url}) — ${queue.currentTrack.duration}`,
    });
  }

  if (queue.tracks.length > 0) {
    const list = queue.tracks
      .slice(0, 10)
      .map((t, i) => `**${i + 1}.** [${t.title}](${t.url}) — ${t.duration}`)
      .join('\n');

    const remaining = queue.tracks.length > 10
      ? `\n...and ${queue.tracks.length - 10} more`
      : '';

    embed.addFields({
      name: `Up Next (${queue.tracks.length} track${queue.tracks.length === 1 ? '' : 's'})`,
      value: list + remaining,
    });
  } else {
    embed.addFields({ name: 'Up Next', value: 'No tracks in queue' });
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`music/clear/${guildId}`)
      .setLabel('Clear Queue')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('\uD83D\uDDD1\uFE0F'),
  );

  return { embed, row };
}
