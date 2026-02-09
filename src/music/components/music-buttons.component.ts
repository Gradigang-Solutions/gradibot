import { Injectable } from '@nestjs/common';
import { Button, ButtonContext, Context, ComponentParam } from 'necord';
import { PlayerService } from '../services/player.service';
import { QueueService } from '../services/queue.service';

@Injectable()
export class MusicButtonsComponent {
  constructor(
    private readonly playerService: PlayerService,
    private readonly queueService: QueueService,
  ) {}

  @Button('music/pause-resume/:guildId')
  async onPauseResume(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('guildId') guildId: string,
  ) {
    const queue = this.queueService.get(guildId);
    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing.', ephemeral: true });
    }

    if (queue.isPaused) {
      this.playerService.resume(guildId);
      return interaction.reply('Resumed playback.');
    } else {
      this.playerService.pause(guildId);
      return interaction.reply('Paused playback.');
    }
  }

  @Button('music/skip/:guildId')
  async onSkip(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('guildId') guildId: string,
  ) {
    const queue = this.queueService.get(guildId);
    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing.', ephemeral: true });
    }

    const title = queue.currentTrack?.title ?? 'current track';
    this.playerService.skip(guildId);
    return interaction.reply(`Skipped **${title}**.`);
  }

  @Button('music/stop/:guildId')
  async onStop(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('guildId') guildId: string,
  ) {
    const queue = this.queueService.get(guildId);
    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing.', ephemeral: true });
    }

    this.playerService.destroy(guildId);
    return interaction.reply('Stopped playback and left the voice channel.');
  }

  @Button('music/clear/:guildId')
  async onClear(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('guildId') guildId: string,
  ) {
    const queue = this.queueService.get(guildId);
    if (!queue) {
      return interaction.reply({ content: 'Nothing is playing.', ephemeral: true });
    }

    this.queueService.clearTracks(guildId);
    return interaction.reply('Cleared the queue. Current track continues playing.');
  }
}
