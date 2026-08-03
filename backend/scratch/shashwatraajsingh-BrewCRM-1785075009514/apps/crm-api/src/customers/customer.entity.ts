import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Order } from '../orders/order.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  phone!: string;

  @Column({ default: 'email' })
  preferredChannel!: string; // email | whatsapp | sms | rcs

  @Column({ default: 'active' })
  status!: string; // active | churned | at_risk

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalSpent!: number;

  @Column({ default: 0 })
  totalOrders!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastOrderAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  firstOrderAt!: Date | null;

  @Column({ type: 'jsonb', default: '[]' })
  tags!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Order, (order) => order.customer)
  orders!: Order[];
}
