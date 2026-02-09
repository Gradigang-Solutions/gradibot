import { Injectable, Logger } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { QueueService } from '../services/queue.service';
import { createQueueEmbed } from '../embeds/queue.embed';

@Injectable()
export class QueueCommand {
  private readonly logger = new Logger(QueueCommand.name);

  constructor(private readonly queueService: QueueService) {}

  @SlashCommand({
    name: 'queue',
    description: 'Display the current music queue',
  })
  async onQueue(@Context() [interaction]: SlashCommandContext) {
    try {
      const queue = this.queueService.get(interaction.guildId!);
      if (!queue) {
        return await interaction.reply({
          content: 'Nothing is playing right now.',
          ephemeral: true,
        });
      }

      const embed = createQueueEmbed(queue);
      return await interaction.reply({ embeds: [embed] });
    } catch (error) {
      this.logger.error(`Queue command error: ${error}`);
    }
  }
}
