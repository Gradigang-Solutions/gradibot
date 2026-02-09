import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { PlayerService } from '../services/player.service';
import { QueueService } from '../services/queue.service';

@Injectable()
export class PauseCommand {
  constructor(
    private readonly playerService: PlayerService,
    private readonly queueService: QueueService,
  ) {}

  @SlashCommand({
    name: 'pause',
    description: 'Pause the current track',
  })
  async onPause(@Context() [interaction]: SlashCommandContext) {
    const queue = this.queueService.get(interaction.guildId!);
    if (!queue) {
      return interaction.reply({
        content: 'Nothing is playing right now.',
        ephemeral: true,
      });
    }

    if (queue.isPaused) {
      return interaction.reply({
        content: 'Playback is already paused. Use `/resume` to continue.',
        ephemeral: true,
      });
    }

    this.playerService.pause(interaction.guildId!);
    return interaction.reply('Paused playback.');
  }
}
