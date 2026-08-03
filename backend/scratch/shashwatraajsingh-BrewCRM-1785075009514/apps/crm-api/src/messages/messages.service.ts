import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  async createBulk(
    messages: Partial<Message>[],
  ): Promise<Message[]> {
    const entities = this.messageRepo.create(messages);
    return this.messageRepo.save(entities, { chunk: 100 });
  }

  async findOne(id: string): Promise<Message> {
    const message = await this.messageRepo.findOne({ where: { id } });
    if (!message) {
      throw new NotFoundException(`Message ${id} not found`);
    }
    return message;
  }

  async findByCampaign(
    campaignId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ messages: Message[]; total: number }> {
    const [messages, total] = await this.messageRepo.findAndCount({
      where: { campaignId },
      relations: ['customer'],
      order: { createdAt: 'ASC' },
      take: pagination.limit,
      skip: pagination.offset,
    });

    return { messages, total };
  }

  async updateStatus(
    id: string,
    status: string,
    timestamp: Date,
  ): Promise<Message> {
    const message = await this.findOne(id);

    message.status = status;

    switch (status) {
      case 'sent':
        message.sentAt = timestamp;
        break;
      case 'delivered':
        message.deliveredAt = timestamp;
        break;
      case 'opened':
        message.openedAt = timestamp;
        break;
      case 'clicked':
        message.clickedAt = timestamp;
        break;
      case 'ordered':
        message.orderedAt = timestamp;
        break;
      case 'failed':
        break;
    }

    return this.messageRepo.save(message);
  }
}
