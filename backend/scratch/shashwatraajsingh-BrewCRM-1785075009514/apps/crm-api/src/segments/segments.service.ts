import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Segment, SegmentRule } from './segment.entity';
import { Customer } from '../customers/customer.entity';

@Injectable()
export class SegmentsService {
  constructor(
    @InjectRepository(Segment)
    private readonly segmentRepo: Repository<Segment>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async findAll(): Promise<Segment[]> {
    return this.segmentRepo.find({ order: { createdAt: 'DESC' } });
  }

  async create(data: {
    name: string;
    description?: string;
    rules: SegmentRule[];
    createdBy?: string;
  }): Promise<Segment> {
    const segment = this.segmentRepo.create({
      name: data.name,
      description: data.description,
      rules: data.rules,
      createdBy: data.createdBy || 'manual',
    });

    const saved = await this.segmentRepo.save(segment);

    // Compute customer count
    const customers = await this.resolveCustomers(saved.rules);
    saved.customerCount = customers.length;
    await this.segmentRepo.save(saved);

    return saved;
  }

  async findOneWithCustomers(
    id: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ segment: Segment; customers: Customer[]; total: number }> {
    const segment = await this.segmentRepo.findOne({ where: { id } });
    if (!segment) {
      throw new NotFoundException(`Segment ${id} not found`);
    }

    const allCustomers = await this.resolveCustomers(segment.rules);
    const total = allCustomers.length;
    const customers = allCustomers.slice(
      pagination.offset,
      pagination.offset + pagination.limit,
    );

    return { segment, customers, total };
  }

  async findOne(id: string): Promise<Segment> {
    const segment = await this.segmentRepo.findOne({ where: { id } });
    if (!segment) {
      throw new NotFoundException(`Segment ${id} not found`);
    }
    return segment;
  }

  async remove(id: string): Promise<void> {
    const result = await this.segmentRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Segment ${id} not found`);
    }
  }

  async refreshCount(id: string): Promise<Segment> {
    const segment = await this.findOne(id);
    const customers = await this.resolveCustomers(segment.rules);
    segment.customerCount = customers.length;
    return this.segmentRepo.save(segment);
  }

  /**
   * Core segment engine: resolves customers matching all rules (AND logic).
   * Uses raw TypeORM QueryBuilder to translate each rule into a WHERE clause.
   */
  async resolveCustomers(rules: SegmentRule[]): Promise<Customer[]> {
    const qb = this.customerRepo.createQueryBuilder('customer');
    let paramIndex = 0;

    for (const rule of rules) {
      paramIndex++;
      const paramName = `p${paramIndex}`;

      this.applyRule(qb, rule, paramName);
    }

    return qb.getMany();
  }

  /**
   * Like resolveCustomers but with ORDER BY and LIMIT applied at the SQL level.
   */
  async resolveCustomersSorted(
    rules: SegmentRule[],
    sortBy: string,
    sortOrder: 'ASC' | 'DESC',
    limit: number,
  ): Promise<Customer[]> {
    const qb = this.customerRepo.createQueryBuilder('customer');
    let paramIndex = 0;

    for (const rule of rules) {
      paramIndex++;
      const paramName = `p${paramIndex}`;
      this.applyRule(qb, rule, paramName);
    }

    // Validate sortBy to prevent SQL injection
    const allowedSortFields = ['totalOrders', 'totalSpent', 'lastOrderAt', 'name', 'createdAt'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'totalOrders';

    qb.orderBy(`customer.${safeSortBy}`, sortOrder);
    qb.limit(limit);

    return qb.getMany();
  }

  private applyRule(
    qb: SelectQueryBuilder<Customer>,
    rule: SegmentRule,
    paramName: string,
  ): void {
    const { field, operator, value } = rule;

    // Handle special computed fields
    if (field === 'daysSinceLastOrder') {
      const expr = `EXTRACT(DAY FROM NOW() - customer.lastOrderAt)`;
      switch (operator) {
        case 'gte':
        case 'days_ago_gte':
          qb.andWhere(`${expr} >= :${paramName}`, { [paramName]: value });
          break;
        case 'lte':
        case 'days_ago_lte':
          qb.andWhere(`${expr} <= :${paramName}`, { [paramName]: value });
          break;
        case 'eq':
          qb.andWhere(`${expr} = :${paramName}`, { [paramName]: value });
          break;
        default:
          qb.andWhere(`${expr} >= :${paramName}`, { [paramName]: value });
      }
      return;
    }

    // Handle tags (jsonb)
    if (field === 'tags') {
      if (operator === 'contains') {
        // Check if tags array contains the value
        qb.andWhere(`customer.tags @> :${paramName}::jsonb`, {
          [paramName]: JSON.stringify([value]),
        });
        return;
      }
      if (operator === 'in') {
        // Check if tags overlap with any of the provided values
        const values = Array.isArray(value) ? value : [value];
        qb.andWhere(`customer.tags ?| :${paramName}`, {
          [paramName]: values,
        });
        return;
      }
    }

    // Standard field mappings
    const columnName = `customer.${field}`;

    switch (operator) {
      case 'gte':
        qb.andWhere(`${columnName} >= :${paramName}`, { [paramName]: value });
        break;
      case 'lte':
        qb.andWhere(`${columnName} <= :${paramName}`, { [paramName]: value });
        break;
      case 'eq':
        qb.andWhere(`${columnName} = :${paramName}`, { [paramName]: value });
        break;
      case 'neq':
        qb.andWhere(`${columnName} != :${paramName}`, { [paramName]: value });
        break;
      case 'in':
        qb.andWhere(`${columnName} IN (:...${paramName})`, {
          [paramName]: Array.isArray(value) ? value : [value],
        });
        break;
      case 'not_in':
        qb.andWhere(`${columnName} NOT IN (:...${paramName})`, {
          [paramName]: Array.isArray(value) ? value : [value],
        });
        break;
      case 'days_ago_gte':
        qb.andWhere(
          `EXTRACT(DAY FROM NOW() - ${columnName}) >= :${paramName}`,
          { [paramName]: value },
        );
        break;
      case 'days_ago_lte':
        qb.andWhere(
          `EXTRACT(DAY FROM NOW() - ${columnName}) <= :${paramName}`,
          { [paramName]: value },
        );
        break;
      case 'contains':
        qb.andWhere(`${columnName}::text ILIKE :${paramName}`, {
          [paramName]: `%${value}%`,
        });
        break;
      default:
        // Fallback to equality
        qb.andWhere(`${columnName} = :${paramName}`, { [paramName]: value });
    }
  }
}
