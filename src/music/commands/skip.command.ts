import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { PlayerService } from '../services/player.service';
import { QueueService } from '../services/queue.service';

@Injectable()
export class SkipCommand {
  constructor(
    private readonly playerService: PlayerService,
    private readonly queueService: QueueService,
  ) {}

  @SlashCommand({
    name: 'skip',
    description: 'Skip the current track',
  })
  async onSkip(@Context() [interaction]: SlashCommandContext) {
    const queue = this.queueService.get(interaction.guildId!);
    if (!queue) {
      return interaction.reply({
        content: 'Nothing is playing right now.',
        ephemeral: true,
      });
    }

    const title = queue.currentTrack?.title ?? 'current track';
    this.playerService.skip(interaction.guildId!);
    return interaction.reply(`Skipped **${title}**.`);
  }
}
