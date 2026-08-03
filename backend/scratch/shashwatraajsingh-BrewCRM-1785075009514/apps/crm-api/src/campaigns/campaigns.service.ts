import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Campaign } from './campaign.entity';
import { SegmentsService } from '../segments/segments.service';
import { MessagesService } from '../messages/messages.service';
import { Customer } from '../customers/customer.entity';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectQueue('campaign-send')
    private readonly campaignSendQueue: Queue,
    private readonly segmentsService: SegmentsService,
    private readonly messagesService: MessagesService,
  ) {}

  async findAll(): Promise<Campaign[]> {
    return this.campaignRepo.find({
      relations: ['segment'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: {
    name: string;
    segmentId: string;
    channel: string;
    messageTemplate: string;
    aiPrompt?: string;
    scheduledAt?: string;
  }): Promise<Campaign> {
    const segment = await this.segmentsService.findOne(data.segmentId);

    const campaign = this.campaignRepo.create({
      name: data.name,
      segmentId: data.segmentId,
      channel: data.channel,
      messageTemplate: data.messageTemplate,
      aiPrompt: data.aiPrompt,
      status: 'draft',
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
    });

    return this.campaignRepo.save(campaign);
  }

  async findOne(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { id },
      relations: ['segment'],
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }
    return campaign;
  }

  async launch(id: string): Promise<Campaign> {
    const campaign = await this.findOne(id);

    if (campaign.status !== 'draft') {
      throw new BadRequestException(
        `Campaign is in '${campaign.status}' state, can only launch 'draft' campaigns`,
      );
    }

    // Resolve segment customers
    const segment = await this.segmentsService.findOne(campaign.segmentId);
    const customers = await this.segmentsService.resolveCustomers(segment.rules);

    if (customers.length === 0) {
      throw new BadRequestException('Segment has no matching customers');
    }

    // Create personalized messages for each customer
    const messages = await this.messagesService.createBulk(
      customers.map((customer) => ({
        campaignId: campaign.id,
        customerId: customer.id,
        channel: campaign.channel,
        personalizedText: this.personalizeTemplate(
          campaign.messageTemplate,
          customer,
        ),
        status: 'queued',
      })),
    );

    // Update campaign status
    campaign.status = 'sending';
    campaign.totalCount = customers.length;
    await this.campaignRepo.save(campaign);

    // Enqueue BullMQ jobs
    const jobs = messages.map((msg, index) => {
      const customer = customers[index];
      return {
        name: 'send-message',
        data: {
          messageId: msg.id,
          campaignId: campaign.id,
          customerId: customer.id,
          channel: campaign.channel,
          personalizedText: msg.personalizedText,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          customerName: customer.name,
        },
      };
    });

    await this.campaignSendQueue.addBulk(jobs);

    this.logger.log(
      `Campaign ${campaign.id} launched: ${customers.length} messages queued`,
    );

    return campaign;
  }

  async getMessages(
    campaignId: string,
    pagination: { limit: number; offset: number },
  ) {
    return this.messagesService.findByCampaign(campaignId, pagination);
  }

  /**
   * Replace template variables with customer data.
   * Supports: {{customer.name}}, {{customer.totalOrders}},
   *           {{customer.daysSinceLastOrder}}, {{customer.totalSpent}}
   */
  private personalizeTemplate(template: string, customer: Customer): string {
    const daysSinceLastOrder = customer.lastOrderAt
      ? Math.floor(
          (Date.now() - new Date(customer.lastOrderAt).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    return template
      .replace(/\{\{customer\.name\}\}/g, customer.name)
      .replace(
        /\{\{customer\.totalOrders\}\}/g,
        String(customer.totalOrders),
      )
      .replace(
        /\{\{customer\.daysSinceLastOrder\}\}/g,
        String(daysSinceLastOrder),
      )
      .replace(
        /\{\{customer\.totalSpent\}\}/g,
        String(customer.totalSpent),
      );
  }
}
