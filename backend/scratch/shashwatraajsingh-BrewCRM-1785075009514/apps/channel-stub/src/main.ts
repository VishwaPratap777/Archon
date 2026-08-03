import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Health check endpoint
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', async (_req: unknown, res: { json: (body: unknown) => void }) => {
    res.json({ status: 'ok', service: 'channel-stub' });
  });

  const port = process.env['PORT'] || 3001;
  await app.listen(port);
  logger.log(`Channel Stub running on http://localhost:${port}`);
}

bootstrap();
