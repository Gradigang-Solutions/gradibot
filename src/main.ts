import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Client } from 'discord.js';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();

  const client = app.get(Client);
  client.on('error', (error) => {
    logger.error(`Discord client error: ${error.message}`);
  });
}

bootstrap();
