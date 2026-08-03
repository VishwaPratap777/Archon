import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { Campaign } from '../campaigns/campaign.entity';
import { MessagesService } from '../messages/messages.service';

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);
  private readonly redis: Redis;

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly messagesService: MessagesService,
  ) {
    const redisUrl = process.env['UPSTASH_REDIS_URL'];
    if (redisUrl) {
      this.redis = new Redis(redisUrl);
    } else {
      this.redis = new Redis({
        host: process.env['REDIS_HOST'] || 'localhost',
        port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
      });
    }
  }

  async processReceipt(
    messageId: string,
    status: string,
    timestamp: Date,
    _metadata?: Record<string, unknown>,
  ): Promise<{ processed: boolean }> {
    // Idempotency check: SET NX with 24h expiry
    const key = `receipt:${messageId}:${status}`;
    const wasSet = await this.redis.set(key, '1', 'EX', 86400, 'NX');

    if (!wasSet) {
      this.logger.debug(`Duplicate receipt ignored: ${key}`);
      return { processed: false };
    }

    try {
      // Update message status
      const message = await this.messagesService.updateStatus(
        messageId,
        status,
        timestamp,
      );

      // Atomic campaign counter update
      const counterField = this.getCounterField(status);
      if (counterField) {
        await this.campaignRepo.increment(
          { id: message.campaignId },
          counterField,
          1,
        );
      }

      // Check if campaign is completed
      await this.checkCampaignCompletion(message.campaignId);

      return { processed: true };
    } catch (error) {
      this.logger.error(
        `Failed to process receipt for message ${messageId}: ${error}`,
      );
      // Remove the idempotency key so it can be retried
      await this.redis.del(key);
      throw error;
    }
  }

  private getCounterField(
    status: string,
  ): keyof Pick<
    Campaign,
    | 'deliveredCount'
    | 'failedCount'
    | 'openedCount'
    | 'clickedCount'
    | 'ordersCount'
  > | null {
    switch (status) {
      case 'delivered':
        return 'deliveredCount';
      case 'failed':
        return 'failedCount';
      case 'opened':
        return 'openedCount';
      case 'clicked':
        return 'clickedCount';
      case 'ordered':
        return 'ordersCount';
      default:
        return null;
    }
  }

  /**
   * Check if all messages have been processed (sent or failed).
   * If so, mark campaign as completed.
   */
  private async checkCampaignCompletion(campaignId: string): Promise<void> {
    const campaign = await this.campaignRepo.findOne({
      where: { id: campaignId },
    });

    if (!campaign || campaign.status !== 'sending') {
      return;
    }

    // Campaign is complete when all messages have a terminal delivery status
    // (delivered + failed === totalCount means all messages got a delivery response)
    if (
      campaign.deliveredCount + campaign.failedCount >= campaign.totalCount &&
      campaign.totalCount > 0
    ) {
      campaign.status = 'completed';
      campaign.completedAt = new Date();
      await this.campaignRepo.save(campaign);
      this.logger.log(`Campaign ${campaignId} completed`);
    }
  }
}
