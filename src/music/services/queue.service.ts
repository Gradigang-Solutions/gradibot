import { Injectable } from '@nestjs/common';
import { GuildQueue } from '../interfaces/guild-queue.interface';
import { Track } from '../interfaces/track.interface';

@Injectable()
export class QueueService {
  private readonly queues = new Map<string, GuildQueue>();

  get(guildId: string): GuildQueue | undefined {
    return this.queues.get(guildId);
  }

  set(guildId: string, queue: GuildQueue): void {
    this.queues.set(guildId, queue);
  }

  delete(guildId: string): void {
    this.queues.delete(guildId);
  }

  addTrack(guildId: string, track: Track): void {
    const queue = this.queues.get(guildId);
    if (queue) {
      queue.tracks.push(track);
    }
  }

  clearTracks(guildId: string): void {
    const queue = this.queues.get(guildId);
    if (queue) {
      queue.tracks = [];
    }
  }

  nextTrack(guildId: string): Track | undefined {
    const queue = this.queues.get(guildId);
    if (queue) {
      return queue.tracks.shift();
    }
    return undefined;
  }
}
