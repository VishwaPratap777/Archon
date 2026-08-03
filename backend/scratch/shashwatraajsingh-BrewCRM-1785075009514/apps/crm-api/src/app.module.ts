import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { CustomersModule } from './customers/customers.module';
import { OrdersModule } from './orders/orders.module';
import { SegmentsModule } from './segments/segments.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { MessagesModule } from './messages/messages.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { AgentModule } from './agent/agent.module';
import { QueueModule } from './queue/queue.module';
import { SeedModule } from './seed/seed.module';
import { Customer } from './customers/customer.entity';
import { Order } from './orders/order.entity';
import { Segment } from './segments/segment.entity';
import { Campaign } from './campaigns/campaign.entity';
import { Message } from './messages/message.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        ...(config.get<string>('DATABASE_URL') 
          ? { 
              url: config.get<string>('DATABASE_URL'),
              ssl: { rejectUnauthorized: false }
            }
          : {
              host: config.get<string>('DB_HOST', 'localhost'),
              port: config.get<number>('DB_PORT', 5432),
              username: config.get<string>('DB_USER', 'postgres'),
              password: config.get<string>('DB_PASS', 'postgres'),
              database: config.get<string>('DB_NAME', 'brewcrm'),
            }),
        entities: [Customer, Order, Segment, Campaign, Message],
        synchronize: true,
        logging: false,
      }),
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
    CustomersModule,
    OrdersModule,
    SegmentsModule,
    CampaignsModule,
    MessagesModule,
    ReceiptsModule,
    AgentModule,
    QueueModule,
    SeedModule,
  ],
})
export class AppModule {}
