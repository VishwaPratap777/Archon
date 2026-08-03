import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './customer.entity';

interface FindAllOptions {
  status?: string;
  channel?: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async findAll(options: FindAllOptions): Promise<{ data: Customer[]; total: number }> {
    const qb = this.customerRepo.createQueryBuilder('customer');

    if (options.status) {
      qb.andWhere('customer.status = :status', { status: options.status });
    }

    if (options.channel) {
      qb.andWhere('customer.preferredChannel = :channel', {
        channel: options.channel,
      });
    }

    const total = await qb.getCount();

    qb.orderBy('customer.createdAt', 'DESC');

    if (options.limit) {
      qb.limit(options.limit);
    }
    if (options.offset) {
      qb.offset(options.offset);
    }

    const customers = await qb.getMany();

    return { data: customers, total };
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customerRepo.findOne({
      where: { id },
      relations: ['orders'],
    });

    if (!customer) {
      throw new NotFoundException(`Customer ${id} not found`);
    }

    return customer;
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    churned: number;
    at_risk: number;
    avgOrderValue: number;
    avgOrderCount: number;
  }> {
    const total = await this.customerRepo.count();
    const active = await this.customerRepo.count({
      where: { status: 'active' },
    });
    const churned = await this.customerRepo.count({
      where: { status: 'churned' },
    });
    const at_risk = await this.customerRepo.count({
      where: { status: 'at_risk' },
    });

    const result = await this.customerRepo
      .createQueryBuilder('customer')
      .select('AVG(customer.totalSpent / NULLIF(customer.totalOrders, 0))', 'avgOrderValue')
      .addSelect('AVG(customer.totalOrders)', 'avgOrderCount')
      .where('customer.totalOrders > 0')
      .getRawOne();

    return {
      total,
      active,
      churned,
      at_risk,
      avgOrderValue: parseFloat(result?.avgOrderValue || '0'),
      avgOrderCount: parseFloat(result?.avgOrderCount || '0'),
    };
  }

  async count(): Promise<number> {
    return this.customerRepo.count();
  }
}
