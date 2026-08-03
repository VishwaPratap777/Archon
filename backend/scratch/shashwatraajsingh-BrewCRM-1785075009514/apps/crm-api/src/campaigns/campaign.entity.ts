import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Segment } from '../segments/segment.entity';

@Entity('campaigns')
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @ManyToOne(() => Segment, (segment) => segment.campaigns, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'segmentId' })
  segment!: Segment;

  @Column()
  segmentId!: string;

  @Column()
  channel!: string; // email | whatsapp | sms | rcs

  @Column({ type: 'text' })
  messageTemplate!: string;

  @Column({ default: 'draft' })
  status!: string; // draft | sending | completed | failed

  @Column({ default: 0 })
  totalCount!: number;

  @Column({ default: 0 })
  sentCount!: number;

  @Column({ default: 0 })
  deliveredCount!: number;

  @Column({ default: 0 })
  failedCount!: number;

  @Column({ default: 0 })
  openedCount!: number;

  @Column({ default: 0 })
  clickedCount!: number;

  @Column({ default: 0 })
  ordersCount!: number;

  @Column({ nullable: true })
  aiPrompt!: string;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
