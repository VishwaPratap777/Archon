import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

interface SendPayload {
  messageId: string;
  recipient: { email: string; phone: string; name: string };
  channel: string;
  text: string;
}

@Injectable()
export class ChannelService {
  private readonly logger = new Logger(ChannelService.name);

  constructor(
    @InjectQueue('delivery-simulation')
    private readonly deliveryQueue: Queue,
  ) {}

  async enqueueSend(payload: SendPayload): Promise<void> {
    await this.deliveryQueue.add('simulate-delivery', payload);
    this.logger.debug(`Enqueued delivery simulation for message ${payload.messageId}`);
  }
}
