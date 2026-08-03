import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Campaign } from '../campaigns/campaign.entity';
import { Customer } from '../customers/customer.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Campaign, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaignId' })
  campaign!: Campaign;

  @Column()
  campaignId!: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer!: Customer;

  @Column()
  customerId!: string;

  @Column()
  channel!: string;

  @Column({ type: 'text' })
  personalizedText!: string;

  @Column({ default: 'queued' })
  status!: string; // queued | sent | delivered | failed | opened | clicked | ordered

  @Column({ type: 'timestamp', nullable: true })
  sentAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  openedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  clickedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  orderedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
