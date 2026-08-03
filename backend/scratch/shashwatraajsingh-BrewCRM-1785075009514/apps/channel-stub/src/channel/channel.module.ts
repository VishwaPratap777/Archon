import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ChannelController } from './channel.controller';
import { ChannelService } from './channel.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'delivery-simulation' })],
  controllers: [ChannelController],
  providers: [ChannelService],
})
export class ChannelModule {}
