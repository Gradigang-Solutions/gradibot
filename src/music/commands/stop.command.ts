import { Injectable } from '@nestjs/common';
import { Context, SlashCommand, SlashCommandContext } from 'necord';
import { PlayerService } from '../services/player.service';
import { QueueService } from '../services/queue.service';

@Injectable()
export class StopCommand {
  constructor(
    private readonly playerService: PlayerService,
    private readonly queueService: QueueService,
  ) {}

  @SlashCommand({
    name: 'stop',
    description: 'Stop playback and leave the voice channel',
  })
  async onStop(@Context() [interaction]: SlashCommandContext) {
    const queue = this.queueService.get(interaction.guildId!);
    if (!queue) {
      return interaction.reply({
        content: 'Nothing is playing right now.',
        ephemeral: true,
      });
    }

    this.playerService.destroy(interaction.guildId!);
    return interaction.reply('Stopped playback and left the voice channel.');
  }
}
