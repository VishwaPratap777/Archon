import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { Order } from '../orders/order.entity';
import { Segment, SegmentRule } from '../segments/segment.entity';

// Indian first names
const FIRST_NAMES_MALE = [
  'Aarav', 'Vihaan', 'Aditya', 'Sai', 'Arjun', 'Reyansh', 'Ayaan', 'Krishna',
  'Ishaan', 'Shaurya', 'Atharv', 'Advik', 'Vivaan', 'Ansh', 'Dhruv', 'Kabir',
  'Ritvik', 'Aarush', 'Kian', 'Darsh', 'Rudra', 'Arnav', 'Pranav', 'Advait',
  'Rishi', 'Yash', 'Nikhil', 'Rohan', 'Tanmay', 'Harsh', 'Kunal', 'Varun',
  'Siddharth', 'Abhishek', 'Manish', 'Rajesh', 'Suresh', 'Vikram', 'Ajay',
  'Rahul', 'Amit', 'Deepak', 'Gaurav', 'Karthik', 'Naveen', 'Pavan', 'Rakesh',
  'Sameer', 'Tarun', 'Vishal',
];

const FIRST_NAMES_FEMALE = [
  'Aanya', 'Saanvi', 'Aadhya', 'Aaradhya', 'Ananya', 'Pari', 'Anika', 'Navya',
  'Diya', 'Myra', 'Isha', 'Sara', 'Riya', 'Ahana', 'Anvi', 'Prisha', 'Kiara',
  'Meera', 'Nisha', 'Pooja', 'Shreya', 'Tanvi', 'Divya', 'Kavya', 'Neha',
  'Priya', 'Swati', 'Anjali', 'Sneha', 'Pallavi', 'Sunita', 'Rekha', 'Geeta',
  'Lata', 'Jyoti', 'Suman', 'Rani', 'Kiran', 'Rashmi', 'Shweta', 'Deepika',
  'Padma', 'Lakshmi', 'Sita', 'Uma', 'Radha', 'Kamala', 'Seema', 'Nidhi', 'Tara',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Shah', 'Mehta',
  'Joshi', 'Agarwal', 'Reddy', 'Rao', 'Nair', 'Menon', 'Iyer', 'Pillai',
  'Chopra', 'Malhotra', 'Kapoor', 'Bhat', 'Deshmukh', 'Kulkarni', 'Jain',
  'Chauhan', 'Mishra', 'Pandey', 'Dubey', 'Tiwari', 'Saxena', 'Srivastava',
  'Banerjee', 'Chatterjee', 'Mukherjee', 'Das', 'Bose', 'Sen', 'Ghosh',
  'Roy', 'Dutta', 'Majumdar',
];

const TAGS_POOL = [
  'loyalty-member',
  'cold-brew-fan',
  'morning-regular',
  'weekend-visitor',
  'subscription',
];

const PRODUCT_CATEGORIES = ['coffee', 'food', 'merchandise', 'subscription'];
const PRODUCT_WEIGHTS = [0.5, 0.25, 0.15, 0.1]; // cumulative: 0.5, 0.75, 0.9, 1.0

const COFFEE_ITEMS = [
  { name: 'Espresso', price: 180 },
  { name: 'Cappuccino', price: 220 },
  { name: 'Cold Brew', price: 250 },
  { name: 'Latte', price: 230 },
  { name: 'Americano', price: 190 },
  { name: 'Mocha', price: 260 },
  { name: 'Filter Coffee', price: 150 },
  { name: 'Flat White', price: 240 },
];

const FOOD_ITEMS = [
  { name: 'Croissant', price: 180 },
  { name: 'Sandwich', price: 250 },
  { name: 'Brownie', price: 150 },
  { name: 'Muffin', price: 130 },
  { name: 'Cookie', price: 100 },
  { name: 'Bagel', price: 200 },
];

const MERCH_ITEMS = [
  { name: 'Roast & Co. Mug', price: 450 },
  { name: 'Tote Bag', price: 350 },
  { name: 'T-Shirt', price: 500 },
  { name: 'Tumbler', price: 400 },
];

const SUB_ITEMS = [
  { name: 'Monthly Coffee Box', price: 999 },
  { name: 'Weekly Brew Plan', price: 599 },
  { name: 'Annual Membership', price: 2999 },
];

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Segment)
    private readonly segmentRepo: Repository<Segment>,
  ) {}

  async seed(): Promise<void> {
    const existingCount = await this.customerRepo.count();
    if (existingCount > 0) {
      this.logger.log(`Seed skipped: ${existingCount} customers already exist`);
      return;
    }

    this.logger.log('Starting seed...');

    // Generate 500 customers
    const customers = await this.generateCustomers(500);
    this.logger.log(`Created ${customers.length} customers`);

    // Generate ~2000 orders
    const orders = await this.generateOrders(customers, 2000);
    this.logger.log(`Created ${orders.length} orders`);

    // Update customer aggregates from orders
    await this.updateCustomerAggregates(customers);
    this.logger.log('Updated customer aggregates');

    // Create 5 pre-built segments
    await this.createSegments();
    this.logger.log('Created 5 pre-built segments');

    this.logger.log('Seed completed!');
  }

  private async generateCustomers(count: number): Promise<Customer[]> {
    const customers: Partial<Customer>[] = [];
    const usedEmails = new Set<string>();

    for (let i = 0; i < count; i++) {
      const isFemale = Math.random() < 0.5;
      const firstName = isFemale
        ? FIRST_NAMES_FEMALE[Math.floor(Math.random() * FIRST_NAMES_FEMALE.length)]
        : FIRST_NAMES_MALE[Math.floor(Math.random() * FIRST_NAMES_MALE.length)];
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const name = `${firstName} ${lastName}`;

      // Generate unique email
      let email: string;
      let attempt = 0;
      do {
        const suffix = attempt > 0 ? `${attempt}` : '';
        const domain = Math.random() < 0.7 ? 'gmail.com' : 'yahoo.com';
        email = `${firstName.toLowerCase()}${lastName.toLowerCase()}${suffix}@${domain}`;
        attempt++;
      } while (usedEmails.has(email));
      usedEmails.add(email);

      // Phone number +91
      const phone = `+91${Math.floor(7000000000 + Math.random() * 2999999999)}`;

      // Preferred channel: 60% whatsapp, 25% email, 10% sms, 5% rcs
      const channelRand = Math.random();
      let preferredChannel: string;
      if (channelRand < 0.6) preferredChannel = 'whatsapp';
      else if (channelRand < 0.85) preferredChannel = 'email';
      else if (channelRand < 0.95) preferredChannel = 'sms';
      else preferredChannel = 'rcs';

      // Status: 70% active, 20% at_risk, 10% churned
      const statusRand = Math.random();
      let status: string;
      if (statusRand < 0.7) status = 'active';
      else if (statusRand < 0.9) status = 'at_risk';
      else status = 'churned';

      // Tags
      const numTags = Math.floor(Math.random() * 3); // 0-2 tags
      const shuffledTags = [...TAGS_POOL].sort(() => Math.random() - 0.5);
      const tags = shuffledTags.slice(0, numTags);

      // Last order date based on status
      const now = new Date();
      let lastOrderAt: Date;
      if (status === 'active') {
        // Within last 60 days
        lastOrderAt = new Date(
          now.getTime() - Math.random() * 60 * 24 * 60 * 60 * 1000,
        );
      } else if (status === 'at_risk') {
        // 60-90 days ago
        lastOrderAt = new Date(
          now.getTime() - (60 + Math.random() * 30) * 24 * 60 * 60 * 1000,
        );
      } else {
        // churned: 90+ days ago (up to 18 months)
        lastOrderAt = new Date(
          now.getTime() - (90 + Math.random() * 450) * 24 * 60 * 60 * 1000,
        );
      }

      // First order is 1-18 months ago (always before last order)
      const maxFirstOrderAge = 18 * 30 * 24 * 60 * 60 * 1000;
      const minFirstOrderAge = now.getTime() - lastOrderAt.getTime() + 24 * 60 * 60 * 1000;
      const firstOrderAt = new Date(
        now.getTime() -
          Math.max(minFirstOrderAge, Math.random() * maxFirstOrderAge),
      );

      customers.push({
        name,
        email,
        phone,
        preferredChannel,
        status,
        tags,
        lastOrderAt,
        firstOrderAt,
        totalSpent: 0,
        totalOrders: 0,
      });
    }

    // Save in batches
    const entities = this.customerRepo.create(customers);
    return this.customerRepo.save(entities, { chunk: 100 });
  }

  private async generateOrders(
    customers: Customer[],
    targetCount: number,
  ): Promise<Order[]> {
    const orders: Partial<Order>[] = [];

    // Distribute orders proportionally — loyal customers get more
    // Create a weighted distribution
    const weights = customers.map(() => {
      const base = 1 + Math.floor(Math.random() * 5); // 1-5 base
      return Math.random() < 0.2 ? base * 3 : base; // 20% are high-frequency
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    for (let i = 0; i < targetCount; i++) {
      // Pick a customer weighted by frequency
      let rand = Math.random() * totalWeight;
      let customerIndex = 0;
      for (let j = 0; j < weights.length; j++) {
        rand -= weights[j];
        if (rand <= 0) {
          customerIndex = j;
          break;
        }
      }

      const customer = customers[customerIndex];

      // Product category weighted selection
      const catRand = Math.random();
      let category: string;
      let items: Array<{ name: string; price: number }>;
      let cumulativeWeight = 0;
      let selectedCategory = PRODUCT_CATEGORIES[0];
      for (let k = 0; k < PRODUCT_WEIGHTS.length; k++) {
        cumulativeWeight += PRODUCT_WEIGHTS[k];
        if (catRand < cumulativeWeight) {
          selectedCategory = PRODUCT_CATEGORIES[k];
          break;
        }
      }
      category = selectedCategory;

      // Pick items based on category
      let itemPool: Array<{ name: string; price: number }>;
      switch (category) {
        case 'coffee':
          itemPool = COFFEE_ITEMS;
          break;
        case 'food':
          itemPool = FOOD_ITEMS;
          break;
        case 'merchandise':
          itemPool = MERCH_ITEMS;
          break;
        case 'subscription':
          itemPool = SUB_ITEMS;
          break;
        default:
          itemPool = COFFEE_ITEMS;
      }

      // Pick 1-3 items
      const numItems = 1 + Math.floor(Math.random() * 2);
      const orderItems = [];
      let totalAmount = 0;
      for (let j = 0; j < numItems; j++) {
        const item = itemPool[Math.floor(Math.random() * itemPool.length)];
        orderItems.push({ name: item.name, quantity: 1, price: item.price });
        totalAmount += item.price;
      }

      // Order date: between customer's firstOrderAt and lastOrderAt
      const firstOrderTime = customer.firstOrderAt
        ? new Date(customer.firstOrderAt).getTime()
        : Date.now() - 18 * 30 * 24 * 60 * 60 * 1000;
      const lastOrderTime = customer.lastOrderAt
        ? new Date(customer.lastOrderAt).getTime()
        : Date.now();
      const orderTime =
        firstOrderTime + Math.random() * (lastOrderTime - firstOrderTime);

      orders.push({
        customerId: customer.id,
        amount: totalAmount,
        status: 'completed',
        productCategory: category,
        items: orderItems,
        orderedAt: new Date(orderTime),
      });
    }

    const entities = this.orderRepo.create(orders);
    return this.orderRepo.save(entities, { chunk: 100 });
  }

  private async updateCustomerAggregates(customers: Customer[]): Promise<void> {
    // Batch update each customer's totalOrders and totalSpent from their orders
    for (const customer of customers) {
      const result = await this.orderRepo
        .createQueryBuilder('order')
        .select('COUNT(*)', 'count')
        .addSelect('COALESCE(SUM(order.amount), 0)', 'total')
        .where('order.customerId = :id', { id: customer.id })
        .getRawOne();

      const totalOrders = parseInt(result?.count || '0', 10);
      const totalSpent = parseFloat(result?.total || '0');

      await this.customerRepo.update(customer.id, {
        totalOrders,
        totalSpent,
      });
    }
  }

  private async createSegments(): Promise<void> {
    const segments: Array<{
      name: string;
      description: string;
      rules: SegmentRule[];
    }> = [
      {
        name: 'Lapsed Loyal',
        description:
          'Loyal customers (5+ orders) who haven\'t ordered in 60+ days',
        rules: [
          { field: 'totalOrders', operator: 'gte', value: 5 },
          { field: 'daysSinceLastOrder', operator: 'days_ago_gte', value: 60 },
        ],
      },
      {
        name: 'High Spenders',
        description: 'Customers who have spent ₹2000 or more',
        rules: [{ field: 'totalSpent', operator: 'gte', value: 2000 }],
      },
      {
        name: 'At Risk',
        description: 'Customers flagged as at-risk of churning',
        rules: [{ field: 'status', operator: 'eq', value: 'at_risk' }],
      },
      {
        name: 'WhatsApp Engaged',
        description:
          'WhatsApp-preferred customers with 2+ orders',
        rules: [
          { field: 'preferredChannel', operator: 'eq', value: 'whatsapp' },
          { field: 'totalOrders', operator: 'gte', value: 2 },
        ],
      },
      {
        name: 'New Customers',
        description:
          'Recent customers with 2 or fewer orders who ordered in the last 30 days',
        rules: [
          { field: 'totalOrders', operator: 'lte', value: 2 },
          { field: 'daysSinceLastOrder', operator: 'days_ago_lte', value: 30 },
        ],
      },
    ];

    for (const segData of segments) {
      const segment = this.segmentRepo.create({
        ...segData,
        createdBy: 'manual',
      });
      const saved = await this.segmentRepo.save(segment);

      // Compute customer count using the same logic as SegmentsService
      const qb = this.customerRepo.createQueryBuilder('customer');
      let paramIndex = 0;

      for (const rule of segData.rules) {
        paramIndex++;
        const paramName = `p${paramIndex}`;

        if (rule.field === 'daysSinceLastOrder') {
          const expr = `EXTRACT(DAY FROM NOW() - customer.lastOrderAt)`;
          if (
            rule.operator === 'days_ago_gte' ||
            rule.operator === 'gte'
          ) {
            qb.andWhere(`${expr} >= :${paramName}`, {
              [paramName]: rule.value,
            });
          } else {
            qb.andWhere(`${expr} <= :${paramName}`, {
              [paramName]: rule.value,
            });
          }
        } else {
          const col = `customer.${rule.field}`;
          switch (rule.operator) {
            case 'gte':
              qb.andWhere(`${col} >= :${paramName}`, {
                [paramName]: rule.value,
              });
              break;
            case 'lte':
              qb.andWhere(`${col} <= :${paramName}`, {
                [paramName]: rule.value,
              });
              break;
            case 'eq':
              qb.andWhere(`${col} = :${paramName}`, {
                [paramName]: rule.value,
              });
              break;
            default:
              qb.andWhere(`${col} = :${paramName}`, {
                [paramName]: rule.value,
              });
          }
        }
      }

      const count = await qb.getCount();
      saved.customerCount = count;
      await this.segmentRepo.save(saved);
    }
  }
}
