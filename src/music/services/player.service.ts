import { Injectable, Logger } from '@nestjs/common';
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { GuildTextBasedChannel, VoiceBasedChannel } from 'discord.js';
import { spawn } from 'child_process';
import { PassThrough } from 'stream';
import { QueueService } from './queue.service';
import { Track } from '../interfaces/track.interface';
import {
  createNowPlayingEmbed,
  createNowPlayingComponents,
  createPlayedEmbed,
} from '../embeds/now-playing.embed';

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);

  constructor(private readonly queueService: QueueService) {
    const cookieArgs = this.getCookieArgs();
    if (cookieArgs.length) {
      this.logger.log(`Cookie config: ${cookieArgs.join(' ')}`);
    } else {
      this.logger.warn('No cookie config found (YT_DLP_COOKIES_FILE / YT_DLP_COOKIES_FROM_BROWSER not set)');
    }
  }

  async search(query: string): Promise<Track | null> {
    const isUrl = query.startsWith('http://') || query.startsWith('https://');
    const cookieArgs = this.getCookieArgs();
    const args = [
      isUrl ? query : `ytsearch1:${query}`,
      '--dump-json',
      '--no-playlist',
      ...cookieArgs,
    ];

    this.logger.log(`Searching: "${query}" | args: ${JSON.stringify(args)}`);

    return new Promise((resolve) => {
      const proc = spawn('yt-dlp', args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0 || !stdout) {
          this.logger.error(`yt-dlp search failed (exit ${code}) for "${query}"`);
          if (stderr) this.logger.error(`yt-dlp stderr: ${stderr}`);
          resolve(null);
          return;
        }
        try {
          const info = JSON.parse(stdout);
          this.logger.log(`Found: "${info.title}" (${info.duration_string})`);
          resolve({
            url: info.webpage_url ?? info.url,
            title: info.title ?? 'Unknown',
            duration: info.duration_string ?? '0:00',
            thumbnail: info.thumbnail ?? '',
            requestedBy: '',
          });
        } catch (err) {
          this.logger.error(`Failed to parse yt-dlp JSON: ${err}`);
          resolve(null);
        }
      });

      proc.on('error', (err) => {
        this.logger.error(`yt-dlp spawn error: ${err.message}`);
        resolve(null);
      });
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
      this.clearIdleTimeout(existingQueue);
      if (!existingQueue.currentTrack && !existingQueue.isStreamTransitioning) {
        await this.streamTrack(guildId, track);
      } else {
        this.queueService.addTrack(guildId, track);
      }
      return;
    }

    const voiceConnection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    const audioPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });

    this.queueService.set(guildId, {
      voiceConnection,
      audioPlayer,
      tracks: [],
      currentTrack: track,
      textChannel,
      isPaused: false,
      processes: [],
      idleTimeout: null,
      nowPlayingMessage: null,
      recommendations: [],
      isStreamTransitioning: false,
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

  async streamTrack(guildId: string, track: Track, previousTrack?: Track | null): Promise<void> {
    const queue = this.queueService.get(guildId);
    if (!queue) return;

    queue.isStreamTransitioning = true;
    queue.currentTrack = track;
    this.killProcesses(queue.processes);

    try {
      this.logger.log(`Streaming: "${track.title}" (${track.url})`);

      // Edit previous Now Playing message into a "Played" embed
      if (queue.nowPlayingMessage && previousTrack) {
        try {
          const { embed } = createPlayedEmbed(previousTrack);
          await queue.nowPlayingMessage.edit({
            embeds: [embed],
            components: [],
          });
        } catch (err) {
          this.logger.warn(`Failed to edit previous Now Playing message: ${err}`);
        }
        queue.nowPlayingMessage = null;
      }

      const ytdlpArgs = [
        '-f', 'bestaudio',
        '-o', '-',
        '--no-playlist',
        ...this.getCookieArgs(),
        track.url,
      ];

      const ytdlp = spawn('yt-dlp', ytdlpArgs);

      const ffmpeg = spawn('ffmpeg', [
        '-analyzeduration', '0',
        '-probesize', '32768',
        '-i', 'pipe:0',
        '-loglevel', '0',
        '-acodec', 'libopus',
        '-f', 'ogg',
        '-ar', '48000',
        '-ac', '2',
        '-b:a', '128k',
        '-vbr', 'on',
        '-compression_level', '10',
        '-application', 'audio',
        '-frame_duration', '20',
        'pipe:1',
      ]);

      queue.processes = [ytdlp, ffmpeg];

      ytdlp.stdout.pipe(ffmpeg.stdin);

      let ytdlpStderr = '';
      ytdlp.stderr.on('data', (chunk: Buffer) => {
        ytdlpStderr += chunk.toString();
      });

      // Suppress pipe errors (EPIPE when processes are killed)
      ytdlp.stdout.on('error', () => {});
      ffmpeg.stdin.on('error', () => {});
      ffmpeg.stdout.on('error', () => {});

      ytdlp.on('close', (code) => {
        if (code !== 0 && code !== null) {
          this.logger.error(`yt-dlp stream exited with code ${code}`);
          if (ytdlpStderr) this.logger.error(`yt-dlp stderr: ${ytdlpStderr}`);
        }
      });

      ytdlp.on('error', (err) =>
        this.logger.error(`yt-dlp spawn error: ${err.message}`),
      );
      ffmpeg.on('error', (err) =>
        this.logger.error(`FFmpeg error: ${err.message}`),
      );

      const buffer = new PassThrough({ highWaterMark: 1024 * 1024 });
      ffmpeg.stdout.pipe(buffer);
      buffer.on('error', () => {});

      const resource = createAudioResource(buffer, {
        inputType: StreamType.OggOpus,
        silencePaddingFrames: 0,
      });

      queue.isPaused = false;
      queue.recommendations = [];
      queue.audioPlayer.play(resource);
      queue.isStreamTransitioning = false;

      const { embed, row } = createNowPlayingEmbed(track, guildId);
      const nowPlayingMsg = await queue.textChannel.send({
        embeds: [embed],
        components: [row],
      });
      queue.nowPlayingMessage = nowPlayingMsg;

      // Fetch recommendations asynchronously (don't block playback)
      this.fetchRecommendations(track.url).then((recs) => {
        const currentQueue = this.queueService.get(guildId);
        if (!currentQueue || currentQueue.currentTrack !== track) return;

        currentQueue.recommendations = recs;
        if (recs.length > 0 && currentQueue.nowPlayingMessage) {
          const components = createNowPlayingComponents(guildId, recs);
          currentQueue.nowPlayingMessage.edit({ components }).catch((err) =>
            this.logger.warn(`Failed to add recommendation buttons: ${err}`),
          );
        }
      }).catch((err) => {
        this.logger.warn(`Failed to fetch recommendations: ${err}`);
      });
    } catch (error) {
      this.logger.error(`Stream error for "${track.title}": ${error}`);
      queue.isStreamTransitioning = false;
      this.playNext(guildId);
    }
  }

  async fetchRecommendations(videoUrl: string): Promise<Track[]> {
    const videoIdMatch = videoUrl.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!videoIdMatch) return [];

    const videoId = videoIdMatch[1];
    const mixUrl = `https://www.youtube.com/watch?v=${videoId}&list=RD${videoId}`;
    const cookieArgs = this.getCookieArgs();
    const args = [
      '--flat-playlist',
      '--dump-json',
      ...cookieArgs,
      mixUrl,
    ];

    this.logger.log(`Fetching recommendations for ${videoId}`);

    return new Promise((resolve) => {
      const proc = spawn('yt-dlp', args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0 || !stdout) {
          this.logger.warn(`yt-dlp recommendations failed (exit ${code})`);
          if (stderr) this.logger.warn(`yt-dlp stderr: ${stderr}`);
          resolve([]);
          return;
        }
        try {
          const lines = stdout.trim().split('\n');
          const tracks: Track[] = [];
          for (const line of lines) {
            const info = JSON.parse(line);
            const id = info.id ?? info.url;
            // Skip the current video
            if (id === videoId) continue;
            tracks.push({
              url: info.url?.startsWith('http')
                ? info.url
                : `https://www.youtube.com/watch?v=${id}`,
              title: info.title ?? 'Unknown',
              duration: info.duration_string ?? '0:00',
              thumbnail: info.thumbnail ?? info.thumbnails?.[0]?.url ?? '',
              requestedBy: '',
            });
            if (tracks.length >= 3) break;
          }
          this.logger.log(`Found ${tracks.length} recommendations`);
          resolve(tracks);
        } catch (err) {
          this.logger.warn(`Failed to parse recommendations JSON: ${err}`);
          resolve([]);
        }
      });

      proc.on('error', (err) => {
        this.logger.warn(`yt-dlp recommendations spawn error: ${err.message}`);
        resolve([]);
      });
    });
  }

  private static readonly IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  playNext(guildId: string): void {
    const queue = this.queueService.get(guildId);
    if (!queue || queue.isStreamTransitioning) return;

    const previousTrack = queue.currentTrack;
    const nextTrack = this.queueService.nextTrack(guildId);
    if (nextTrack) {
      this.streamTrack(guildId, nextTrack, previousTrack);
    } else {
      this.scheduleIdleDisconnect(guildId);
    }
  }

  private scheduleIdleDisconnect(guildId: string): void {
    const queue = this.queueService.get(guildId);
    if (!queue) return;

    // Edit the last Now Playing message into "Played"
    if (queue.nowPlayingMessage && queue.currentTrack) {
      const lastTrack = queue.currentTrack;
      const { embed } = createPlayedEmbed(lastTrack);
      queue.nowPlayingMessage.edit({ embeds: [embed], components: [] }).catch((err) =>
        this.logger.warn(`Failed to edit Now Playing on idle: ${err}`),
      );
      queue.nowPlayingMessage = null;
    }

    this.clearIdleTimeout(queue);
    queue.currentTrack = null;

    queue.idleTimeout = setTimeout(() => {
      this.logger.log(`Idle timeout reached for guild ${guildId}, disconnecting`);
      this.destroy(guildId);
    }, PlayerService.IDLE_TIMEOUT_MS);
  }

  private clearIdleTimeout(queue: import('../interfaces/guild-queue.interface').GuildQueue): void {
    if (queue.idleTimeout) {
      clearTimeout(queue.idleTimeout);
      queue.idleTimeout = null;
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

    this.clearIdleTimeout(queue);
    this.killProcesses(queue.processes);
    queue.audioPlayer.stop();
    queue.voiceConnection.destroy();
    this.queueService.delete(guildId);
  }

  private getCookieArgs(): string[] {
    if (process.env.YT_DLP_COOKIES_FILE) {
      return ['--cookies', process.env.YT_DLP_COOKIES_FILE];
    }
    if (process.env.YT_DLP_COOKIES_FROM_BROWSER) {
      return ['--cookies-from-browser', process.env.YT_DLP_COOKIES_FROM_BROWSER];
    }
    return [];
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
