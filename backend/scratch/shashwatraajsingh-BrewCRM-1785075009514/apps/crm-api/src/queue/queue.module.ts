import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CampaignSendProcessor } from './campaign-send.processor';
import { MessagesModule } from '../messages/messages.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from '../campaigns/campaign.entity';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'campaign-send' }),
    TypeOrmModule.forFeature([Campaign]),
    MessagesModule,
  ],
  providers: [CampaignSendProcessor],
})
export class QueueModule {}
