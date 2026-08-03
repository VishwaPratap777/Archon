import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async createMany(orders: Partial<Order>[]): Promise<Order[]> {
    const entities = this.orderRepo.create(orders);
    return this.orderRepo.save(entities, { chunk: 100 });
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    return this.orderRepo.find({
      where: { customerId },
      order: { orderedAt: 'DESC' },
    });
  }

  async count(): Promise<number> {
    return this.orderRepo.count();
  }
}
