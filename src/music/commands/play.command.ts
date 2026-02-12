import { Injectable, Logger } from '@nestjs/common';
import { Context, Options, SlashCommand, SlashCommandContext } from 'necord';
import { GuildMember, GuildTextBasedChannel } from 'discord.js';
import { PlayDto } from '../dto/play.dto';
import { PlayerService } from '../services/player.service';
import { QueueService } from '../services/queue.service';

@Injectable()
export class PlayCommand {
  private readonly logger = new Logger(PlayCommand.name);

  constructor(
    private readonly playerService: PlayerService,
    private readonly queueService: QueueService,
  ) {}

  @SlashCommand({
    name: 'play',
    description: 'Play a song from YouTube',
  })
  async onPlay(
    @Context() [interaction]: SlashCommandContext,
    @Options() { query }: PlayDto,
  ) {
    try {
      if (!(interaction.member instanceof GuildMember)) {
        return await interaction.reply({
          content: 'I need to be invited with the **bot** scope to work properly. Please re-invite me using an invite link that includes the `bot` permission.',
          ephemeral: true,
        });
      }

      const member = interaction.member;

      if (!member.voice.channel) {
        return await interaction.reply({
          content: 'You need to be in a voice channel to play music.',
          ephemeral: true,
        });
      }

      await interaction.deferReply();

      const track = await this.playerService.search(query);
      if (!track) {
        return await interaction.editReply('No results found for that query.');
      }

      track.requestedBy = member.displayName;

      const existingQueue = this.queueService.get(interaction.guildId!);
      const wasPlaying = existingQueue?.currentTrack != null;

      await this.playerService.joinAndPlay(
        member.voice.channel,
        interaction.channel! as GuildTextBasedChannel,
        track,
        interaction.guildId!,
      );

      return await interaction.editReply(
        wasPlaying
          ? `Added to queue: **${track.title}** (${track.duration})`
          : `Started playing: **${track.title}** (${track.duration})`,
      );
    } catch (error) {
      this.logger.error(`Play command error: ${error}`);
    }
  }
}
