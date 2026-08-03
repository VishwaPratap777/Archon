import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from '../customers/customer.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Customer, (customer) => customer.orders, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customerId' })
  customer!: Customer;

  @Column()
  customerId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number;

  @Column({ default: 'completed' })
  status!: string;

  @Column({ nullable: true })
  productCategory!: string; // coffee | food | merchandise | subscription

  @Column({ type: 'jsonb', nullable: true })
  items!: Record<string, unknown>[] | null;

  @CreateDateColumn()
  orderedAt!: Date;
}
