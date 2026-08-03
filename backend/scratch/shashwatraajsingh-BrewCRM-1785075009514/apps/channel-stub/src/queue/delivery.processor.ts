import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import axios, { AxiosError } from 'axios';

interface DeliveryPayload {
  messageId: string;
  recipient: { email: string; phone: string; name: string };
  channel: string;
  text: string;
}

@Processor('delivery-simulation')
export class DeliveryProcessor {
  private readonly logger = new Logger(DeliveryProcessor.name);
  private readonly crmApiUrl: string;

  constructor() {
    this.crmApiUrl = process.env['CRM_API_URL'] || 'http://localhost:3000';
  }

  @Process({ name: 'simulate-delivery', concurrency: 10 })
  async handleDelivery(job: Job<DeliveryPayload>): Promise<void> {
    const { messageId } = job.data;

    try {
      // Step 1: Delivery (300-800ms delay)
      await this.delay(300 + Math.random() * 500);

      // 90% delivered, 10% failed
      if (Math.random() < 0.1) {
        await this.sendReceipt(messageId, 'failed');
        this.logger.debug(`Message ${messageId}: FAILED`);
        return;
      }

      await this.sendReceipt(messageId, 'delivered');
      this.logger.debug(`Message ${messageId}: DELIVERED`);

      // Step 2: Opened (2000-6000ms delay) — 45% of delivered
      await this.delay(2000 + Math.random() * 4000);

      if (Math.random() >= 0.45) {
        return; // Not opened
      }

      await this.sendReceipt(messageId, 'opened');
      this.logger.debug(`Message ${messageId}: OPENED`);

      // Step 3: Clicked (1000-3000ms after opened) — 30% of opened
      await this.delay(1000 + Math.random() * 2000);

      if (Math.random() >= 0.3) {
        return; // Not clicked
      }

      await this.sendReceipt(messageId, 'clicked');
      this.logger.debug(`Message ${messageId}: CLICKED`);

      // Step 4: Ordered (2000-5000ms after clicked) — 20% of clicked
      await this.delay(2000 + Math.random() * 3000);

      if (Math.random() >= 0.2) {
        return; // Not ordered
      }

      await this.sendReceipt(messageId, 'ordered');
      this.logger.debug(`Message ${messageId}: ORDERED`);
    } catch (error) {
      this.logger.error(
        `Delivery simulation failed for message ${messageId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Send a receipt callback to the CRM API with retry logic.
   * Retries up to 3 times with exponential backoff.
   */
  private async sendReceipt(
    messageId: string,
    status: string,
    maxRetries = 3,
  ): Promise<void> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await axios.post(`${this.crmApiUrl}/receipts`, {
          messageId,
          status,
          timestamp: new Date().toISOString(),
        });
        return;
      } catch (error) {
        const isLastAttempt = attempt === maxRetries - 1;
        if (isLastAttempt) {
          this.logger.error(
            `Failed to send receipt for ${messageId}/${status} after ${maxRetries} attempts: ${
              error instanceof AxiosError ? error.message : error
            }`,
          );
          return;
        }

        // Exponential backoff: 1s, 2s, 4s
        const backoff = Math.pow(2, attempt) * 1000;
        this.logger.warn(
          `Receipt callback failed for ${messageId}/${status}, retrying in ${backoff}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await this.delay(backoff);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
