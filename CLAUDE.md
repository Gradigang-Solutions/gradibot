# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Gradibot is a Discord music bot built with NestJS + Necord. It streams YouTube audio into voice channels with queue management and button controls.

## Package Manager

Uses **pnpm** (v10.18.3). Always use `pnpm` instead of `npm` or `yarn`.

## Commands

- `pnpm install` — install dependencies
- `pnpm build` — compile TypeScript to `dist/`
- `pnpm start` — run the compiled bot
- `pnpm start:dev` — run in watch mode (development)

## Architecture

```
src/
  main.ts                    # Bootstrap (createApplicationContext, no HTTP)
  app.module.ts              # ConfigModule + NecordModule + MusicModule
  music/
    music.module.ts
    interfaces/              # Track, GuildQueue
    services/
      queue.service.ts       # Map<guildId, GuildQueue> state management
      player.service.ts      # YouTube search, voice join, audio streaming
    commands/                # Slash commands: /play, /skip, /stop, /pause, /resume, /queue
    dto/                     # play.dto.ts (query option)
    components/              # Button interaction handlers (pause/resume, skip, stop, clear)
    embeds/                  # Now Playing embed + Queue embed
```

## Key Technical Details

- Audio pipeline: `play-dl.stream()` → Opus stream → `createAudioResource()` → no FFmpeg transcoding
- Button custom IDs use pattern `music/<action>/<guildId>` with Necord's `@Button()` + `@ComponentParam()`
- Bot uses `createApplicationContext` (no HTTP server)
- Requires `DISCORD_TOKEN` env variable (see `.env.example`)
