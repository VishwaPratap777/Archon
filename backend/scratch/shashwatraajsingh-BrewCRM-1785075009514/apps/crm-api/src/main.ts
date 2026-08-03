import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { SeedService } from './seed/seed.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // CORS configuration
  app.enableCors({
    origin: [
      process.env['FRONTEND_URL'] || 'http://localhost:3002',
      'http://localhost:3002',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  // Health check endpoint
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', async (_req: unknown, res: { json: (body: unknown) => void }) => {
    res.json({ status: 'ok', service: 'crm-api', timestamp: new Date().toISOString() });
  });

  const port = process.env['PORT'] || 3000;
  await app.listen(port);
  logger.log(`CRM API running on http://localhost:${port}`);

  // Proactively wake up the channel-stub to mitigate Render free-tier cold starts
  const channelStubUrl = process.env['CHANNEL_STUB_URL'] || 'http://localhost:3001';
  fetch(`${channelStubUrl}/health`).catch((err) => {
    logger.log(`Wake-up ping to channel-stub failed (expected if local without stub running): ${err.message}`);
  });

  // Seed data on first run
  try {
    const seedService = app.get(SeedService);
    await seedService.seed();
  } catch (error) {
    logger.error(`Seed failed: ${error}`);
  }
}

bootstrap();
