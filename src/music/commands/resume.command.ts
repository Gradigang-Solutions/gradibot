import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { PlayerService } from '../services/player.service';
import { QueueService } from '../services/queue.service';

@Injectable()
export class ResumeCommand {
  constructor(
    private readonly playerService: PlayerService,
    private readonly queueService: QueueService,
  ) {}

  @SlashCommand({
    name: 'resume',
    description: 'Resume the paused track',
  })
  async onResume(@Context() [interaction]: SlashCommandContext) {
    const queue = this.queueService.get(interaction.guildId!);
    if (!queue) {
      return interaction.reply({
        content: 'Nothing is playing right now.',
        ephemeral: true,
      });
    }

    if (!queue.isPaused) {
      return interaction.reply({
        content: 'Playback is not paused.',
        ephemeral: true,
      });
    }

    this.playerService.resume(interaction.guildId!);
    return interaction.reply('Resumed playback.');
  }
}
