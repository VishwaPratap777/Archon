import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { MessagesModule } from '../messages/messages.module';
import { Campaign } from '../campaigns/campaign.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Campaign]), MessagesModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
