import { AudioPlayer, VoiceConnection } from '@discordjs/voice';
import { ChildProcess } from 'child_process';
import { GuildTextBasedChannel } from 'discord.js';
import { Track } from './track.interface';

export interface GuildQueue {
  voiceConnection: VoiceConnection;
  audioPlayer: AudioPlayer;
  tracks: Track[];
  currentTrack: Track | null;
  textChannel: GuildTextBasedChannel;
  isPaused: boolean;
  processes: ChildProcess[];
  idleTimeout: ReturnType<typeof setTimeout> | null;
}
