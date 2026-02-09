import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { PlayerService } from '../services/player.service';
import { QueueService } from '../services/queue.service';

@Injectable()
export class ResumeCommand {
  private readonly logger = new Logger(ResumeCommand.name);

  constructor(
    private readonly playerService: PlayerService,
    private readonly queueService: QueueService,
  ) {}

  @SlashCommand({
    name: 'resume',
    description: 'Resume the paused track',
  })
  async onResume(@Context() [interaction]: SlashCommandContext) {
    try {
      const queue = this.queueService.get(interaction.guildId!);
      if (!queue) {
        return await interaction.reply({
          content: 'Nothing is playing right now.',
          ephemeral: true,
        });
      }

      if (!queue.isPaused) {
        return await interaction.reply({
          content: 'Playback is not paused.',
          ephemeral: true,
        });
      }

      this.playerService.resume(interaction.guildId!);
      return await interaction.reply('Resumed playback.');
    } catch (error) {
      this.logger.error(`Resume command error: ${error}`);
    }
  }
}
