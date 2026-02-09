import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { PlayerService } from '../services/player.service';
import { QueueService } from '../services/queue.service';

@Injectable()
export class StopCommand {
  private readonly logger = new Logger(StopCommand.name);

  constructor(
    private readonly playerService: PlayerService,
    private readonly queueService: QueueService,
  ) {}

  @SlashCommand({
    name: 'stop',
    description: 'Stop playback and leave the voice channel',
  })
  async onStop(@Context() [interaction]: SlashCommandContext) {
    try {
      const queue = this.queueService.get(interaction.guildId!);
      if (!queue) {
        return await interaction.reply({
          content: 'Nothing is playing right now.',
          ephemeral: true,
        });
      }

      this.playerService.destroy(interaction.guildId!);
      return await interaction.reply('Stopped playback and left the voice channel.');
    } catch (error) {
      this.logger.error(`Stop command error: ${error}`);
    }
  }
}
