import { Injectable, Logger } from '@nestjs/common';
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  StreamType,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { GuildTextBasedChannel, VoiceBasedChannel } from 'discord.js';
import { spawn } from 'child_process';
import { QueueService } from './queue.service';
import { Track } from '../interfaces/track.interface';
import { createNowPlayingEmbed } from '../embeds/now-playing.embed';

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);

  constructor(private readonly queueService: QueueService) {}

  async search(query: string): Promise<Track | null> {
    const isUrl = query.startsWith('http://') || query.startsWith('https://');
    const args = [
      isUrl ? query : `ytsearch1:${query}`,
      '--dump-json',
      '--no-warnings',
      '--no-playlist',
      ...(process.env.YT_DLP_COOKIES_FROM_BROWSER
        ? ['--cookies-from-browser', process.env.YT_DLP_COOKIES_FROM_BROWSER]
        : []),
    ];

    return new Promise((resolve) => {
      const proc = spawn('yt-dlp', args);
      let data = '';

      proc.stdout.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0 || !data) {
          resolve(null);
          return;
        }
        try {
          const info = JSON.parse(data);
          resolve({
            url: info.webpage_url ?? info.url,
            title: info.title ?? 'Unknown',
            duration: info.duration_string ?? '0:00',
            thumbnail: info.thumbnail ?? '',
            requestedBy: '',
          });
        } catch {
          resolve(null);
        }
      });

      proc.on('error', () => resolve(null));
    });
  }

  async joinAndPlay(
    voiceChannel: VoiceBasedChannel,
    textChannel: GuildTextBasedChannel,
    track: Track,
    guildId: string,
  ): Promise<void> {
    const existingQueue = this.queueService.get(guildId);

    if (existingQueue) {
      this.queueService.addTrack(guildId, track);
      return;
    }

    const voiceConnection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    const audioPlayer = createAudioPlayer();

    this.queueService.set(guildId, {
      voiceConnection,
      audioPlayer,
      tracks: [],
      currentTrack: track,
      textChannel,
      isPaused: false,
      processes: [],
    });

    voiceConnection.subscribe(audioPlayer);

    voiceConnection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(voiceConnection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(voiceConnection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.destroy(guildId);
      }
    });

    audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this.playNext(guildId);
    });

    audioPlayer.on('error', (error) => {
      this.logger.error(`Audio error: ${error.message}`);
      this.playNext(guildId);
    });

    await this.streamTrack(guildId, track);
  }

  async streamTrack(guildId: string, track: Track): Promise<void> {
    const queue = this.queueService.get(guildId);
    if (!queue) return;

    this.killProcesses(queue.processes);

    try {
      const ytdlp = spawn('yt-dlp', [
        '-f', 'bestaudio',
        '-o', '-',
        '--no-warnings',
        '--no-playlist',
        ...(process.env.YT_DLP_COOKIES_FROM_BROWSER
          ? ['--cookies-from-browser', process.env.YT_DLP_COOKIES_FROM_BROWSER]
          : []),
        track.url,
      ]);

      const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-analyzeduration', '0',
        '-loglevel', '0',
        '-acodec', 'libopus',
        '-f', 'ogg',
        '-ar', '48000',
        '-ac', '2',
        'pipe:1',
      ]);

      queue.processes = [ytdlp, ffmpeg];

      ytdlp.stdout.pipe(ffmpeg.stdin);

      // Suppress pipe errors (EPIPE when processes are killed)
      ytdlp.stdout.on('error', () => {});
      ffmpeg.stdin.on('error', () => {});
      ffmpeg.stdout.on('error', () => {});

      ytdlp.on('error', (err) =>
        this.logger.error(`yt-dlp error: ${err.message}`),
      );
      ffmpeg.on('error', (err) =>
        this.logger.error(`FFmpeg error: ${err.message}`),
      );

      const resource = createAudioResource(ffmpeg.stdout, {
        inputType: StreamType.OggOpus,
      });

      queue.currentTrack = track;
      queue.isPaused = false;
      queue.audioPlayer.play(resource);

      const { embed, row } = createNowPlayingEmbed(track, guildId);
      await queue.textChannel.send({ embeds: [embed], components: [row] });
    } catch (error) {
      this.logger.error(`Stream error for "${track.title}": ${error}`);
      this.playNext(guildId);
    }
  }

  playNext(guildId: string): void {
    const nextTrack = this.queueService.nextTrack(guildId);
    if (nextTrack) {
      this.streamTrack(guildId, nextTrack);
    } else {
      this.destroy(guildId);
    }
  }

  skip(guildId: string): boolean {
    const queue = this.queueService.get(guildId);
    if (!queue) return false;
    this.killProcesses(queue.processes);
    queue.audioPlayer.stop();
    return true;
  }

  pause(guildId: string): boolean {
    const queue = this.queueService.get(guildId);
    if (!queue || queue.isPaused) return false;
    queue.audioPlayer.pause();
    queue.isPaused = true;
    return true;
  }

  resume(guildId: string): boolean {
    const queue = this.queueService.get(guildId);
    if (!queue || !queue.isPaused) return false;
    queue.audioPlayer.unpause();
    queue.isPaused = false;
    return true;
  }

  destroy(guildId: string): void {
    const queue = this.queueService.get(guildId);
    if (!queue) return;

    this.killProcesses(queue.processes);
    queue.audioPlayer.stop();
    queue.voiceConnection.destroy();
    this.queueService.delete(guildId);
  }

  private killProcesses(processes: import('child_process').ChildProcess[]): void {
    for (const proc of processes) {
      if (!proc.killed) {
        proc.kill('SIGKILL');
      }
    }
    processes.length = 0;
  }
}
