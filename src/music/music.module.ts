import { Module } from '@nestjs/common';
import { QueueService } from './services/queue.service';
import { PlayerService } from './services/player.service';
import { PlayCommand } from './commands/play.command';
import { SkipCommand } from './commands/skip.command';
import { StopCommand } from './commands/stop.command';
import { PauseCommand } from './commands/pause.command';
import { ResumeCommand } from './commands/resume.command';
import { QueueCommand } from './commands/queue.command';
import { MusicButtonsComponent } from './components/music-buttons.component';

@Module({
  providers: [
    QueueService,
    PlayerService,
    PlayCommand,
    SkipCommand,
    StopCommand,
    PauseCommand,
    ResumeCommand,
    QueueCommand,
    MusicButtonsComponent,
  ],
})
export class MusicModule {}
