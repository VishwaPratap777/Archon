import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { DeliveryProcessor } from './delivery.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'delivery-simulation' })],
  providers: [DeliveryProcessor],
})
export class StubQueueModule {}
