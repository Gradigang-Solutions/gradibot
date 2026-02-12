import { Injectable, Logger } from '@nestjs/common';
import { Button, ButtonContext, Context, ComponentParam } from 'necord';
import { GuildMember, GuildTextBasedChannel } from 'discord.js';
import { PlayerService } from '../services/player.service';
import { QueueService } from '../services/queue.service';
import { createQueueEmbed } from '../embeds/queue.embed';

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

  @Button('music/queue/:guildId')
  async onQueue(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('guildId') guildId: string,
  ) {
    try {
      const queue = this.queueService.get(guildId);
      if (!queue) {
        return await interaction.reply({ content: 'Nothing is playing.', ephemeral: true });
      }

      const { embed, row } = createQueueEmbed(queue, guildId);
      return await interaction.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      this.logger.error(`Queue button error: ${error}`);
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

  @Button('music/rec/:guildId/:index')
  async onRecommendation(
    @Context() [interaction]: ButtonContext,
    @ComponentParam('guildId') guildId: string,
    @ComponentParam('index') index: string,
  ) {
    try {
      const queue = this.queueService.get(guildId);
      if (!queue) {
        return await interaction.reply({ content: 'Nothing is playing.', ephemeral: true });
      }

      const recIndex = parseInt(index, 10);
      const rec = queue.recommendations[recIndex];
      if (!rec) {
        return await interaction.reply({ content: 'This recommendation is no longer available.', ephemeral: true });
      }

      const member = interaction.member as GuildMember;
      if (!member.voice.channel) {
        return await interaction.reply({
          content: 'You need to be in a voice channel to add songs.',
          ephemeral: true,
        });
      }

      const track = { ...rec, requestedBy: member.displayName };
      await interaction.deferReply();

      await this.playerService.joinAndPlay(
        member.voice.channel,
        interaction.channel! as GuildTextBasedChannel,
        track,
        guildId,
      );

      return await interaction.editReply(
        `Added recommendation to queue: **${track.title}**`,
      );
    } catch (error) {
      this.logger.error(`Recommendation button error: ${error}`);
    }
  }
}
