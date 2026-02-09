import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { PlayerService } from '../services/player.service';
import { QueueService } from '../services/queue.service';

@Injectable()
export class SkipCommand {
  private readonly logger = new Logger(SkipCommand.name);

  constructor(
    private readonly playerService: PlayerService,
    private readonly queueService: QueueService,
  ) {}

  @SlashCommand({
    name: 'skip',
    description: 'Skip the current track',
  })
  async onSkip(@Context() [interaction]: SlashCommandContext) {
    try {
      const queue = this.queueService.get(interaction.guildId!);
      if (!queue) {
        return await interaction.reply({
          content: 'Nothing is playing right now.',
          ephemeral: true,
        });
      }

      const title = queue.currentTrack?.title ?? 'current track';
      this.playerService.skip(interaction.guildId!);
      return await interaction.reply(`Skipped **${title}**.`);
    } catch (error) {
      this.logger.error(`Skip command error: ${error}`);
    }
  }
}
