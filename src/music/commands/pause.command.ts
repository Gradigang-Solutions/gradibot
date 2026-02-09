import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { PlayerService } from '../services/player.service';
import { QueueService } from '../services/queue.service';

@Injectable()
export class PauseCommand {
  private readonly logger = new Logger(PauseCommand.name);

  constructor(
    private readonly playerService: PlayerService,
    private readonly queueService: QueueService,
  ) {}

  @SlashCommand({
    name: 'pause',
    description: 'Pause the current track',
  })
  async onPause(@Context() [interaction]: SlashCommandContext) {
    try {
      const queue = this.queueService.get(interaction.guildId!);
      if (!queue) {
        return await interaction.reply({
          content: 'Nothing is playing right now.',
          ephemeral: true,
        });
      }

      if (queue.isPaused) {
        return await interaction.reply({
          content: 'Playback is already paused. Use `/resume` to continue.',
          ephemeral: true,
        });
      }

      this.playerService.pause(interaction.guildId!);
      return await interaction.reply('Paused playback.');
    } catch (error) {
      this.logger.error(`Pause command error: ${error}`);
    }
  }
}
