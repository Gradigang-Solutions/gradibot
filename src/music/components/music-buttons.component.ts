import { Injectable, Logger } from '@nestjs/common';
import { Button, ButtonContext, Context, ComponentParam } from 'necord';
import { PlayerService } from '../services/player.service';
import { QueueService } from '../services/queue.service';

@Injectable()
export class MusicButtonsComponent {
  private readonly logger = new Logger(MusicButtonsComponent.name);

  constructor(
    private readonly playerService: PlayerService,
    private readonly queueService: QueueService,
  ) {}

  @Button('music/pause-resume/:guildId')
  async onPauseResume(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('guildId') guildId: string,
  ) {
    try {
      const queue = this.queueService.get(guildId);
      if (!queue) {
        return await interaction.reply({ content: 'Nothing is playing.', ephemeral: true });
      }

      if (queue.isPaused) {
        this.playerService.resume(guildId);
        return await interaction.reply('Resumed playback.');
      } else {
        this.playerService.pause(guildId);
        return await interaction.reply('Paused playback.');
      }
    } catch (error) {
      this.logger.error(`Pause/Resume button error: ${error}`);
    }
  }

  @Button('music/skip/:guildId')
  async onSkip(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('guildId') guildId: string,
  ) {
    try {
      const queue = this.queueService.get(guildId);
      if (!queue) {
        return await interaction.reply({ content: 'Nothing is playing.', ephemeral: true });
      }

      const title = queue.currentTrack?.title ?? 'current track';
      this.playerService.skip(guildId);
      return await interaction.reply(`Skipped **${title}**.`);
    } catch (error) {
      this.logger.error(`Skip button error: ${error}`);
    }
  }

  @Button('music/stop/:guildId')
  async onStop(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('guildId') guildId: string,
  ) {
    try {
      const queue = this.queueService.get(guildId);
      if (!queue) {
        return await interaction.reply({ content: 'Nothing is playing.', ephemeral: true });
      }

      this.playerService.destroy(guildId);
      return await interaction.reply('Stopped playback and left the voice channel.');
    } catch (error) {
      this.logger.error(`Stop button error: ${error}`);
    }
  }

  @Button('music/clear/:guildId')
  async onClear(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('guildId') guildId: string,
  ) {
    try {
      const queue = this.queueService.get(guildId);
      if (!queue) {
        return await interaction.reply({ content: 'Nothing is playing.', ephemeral: true });
      }

      this.queueService.clearTracks(guildId);
      return await interaction.reply('Cleared the queue. Current track continues playing.');
    } catch (error) {
      this.logger.error(`Clear button error: ${error}`);
    }
  }
}
