import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ChannelModule } from './channel/channel.module';
import { StubQueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('UPSTASH_REDIS_URL');
        if (redisUrl) {
          const url = new URL(redisUrl);
          return {
            redis: {
              host: url.hostname,
              port: Number(url.port),
              username: url.username || undefined,
              password: url.password || undefined,
              tls: url.protocol === 'rediss:' ? {} : undefined,
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            },
          };
        }
        return {
          redis: {
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
        };
      },
    }),
    ChannelModule,
    StubQueueModule,
  ],
})
export class AppModule {}
