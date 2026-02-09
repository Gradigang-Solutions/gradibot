import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { QueueService } from '../services/queue.service';
import { createQueueEmbed } from '../embeds/queue.embed';

@Injectable()
export class QueueCommand {
  constructor(private readonly queueService: QueueService) {}

  @SlashCommand({
    name: 'queue',
    description: 'Display the current music queue',
  })
  async onQueue(@Context() [interaction]: SlashCommandContext) {
    const queue = this.queueService.get(interaction.guildId!);
    if (!queue) {
      return interaction.reply({
        content: 'Nothing is playing right now.',
        ephemeral: true,
      });
    }

    const embed = createQueueEmbed(queue);
    return interaction.reply({ embeds: [embed] });
  }
}
