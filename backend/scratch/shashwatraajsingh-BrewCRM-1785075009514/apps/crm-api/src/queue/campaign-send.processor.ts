import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Campaign } from '../campaigns/campaign.entity';
import { MessagesService } from '../messages/messages.service';

interface SendMessagePayload {
  messageId: string;
  campaignId: string;
  customerId: string;
  channel: string;
  personalizedText: string;
  customerEmail: string;
  customerPhone: string;
  customerName: string;
}

@Processor('campaign-send')
export class CampaignSendProcessor {
  private readonly logger = new Logger(CampaignSendProcessor.name);
  private readonly channelStubUrl: string;

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly messagesService: MessagesService,
  ) {
    this.channelStubUrl =
      process.env['CHANNEL_STUB_URL'] || 'http://localhost:3001';
  }

  @Process({ name: 'send-message', concurrency: 5 })
  async handleSendMessage(job: Job<SendMessagePayload>): Promise<void> {
    const { messageId, campaignId, channel, personalizedText, customerEmail, customerPhone, customerName } =
      job.data;

    try {
      // Call channel stub
      await axios.post(`${this.channelStubUrl}/send`, {
        messageId,
        recipient: {
          email: customerEmail,
          phone: customerPhone,
          name: customerName,
        },
        channel,
        text: personalizedText,
      });

      // Update message status to sent
      await this.messagesService.updateStatus(messageId, 'sent', new Date());

      // Atomic increment of sentCount
      await this.campaignRepo.increment({ id: campaignId }, 'sentCount', 1);

      this.logger.debug(`Message ${messageId} sent successfully`);
    } catch (error) {
      this.logger.error(
        `Failed to send message ${messageId}: ${error instanceof Error ? error.message : error}`,
      );
      // Don't throw — failed jobs shouldn't crash the worker
      // The message stays in 'queued' status for retry or manual intervention
    }
  }
}
