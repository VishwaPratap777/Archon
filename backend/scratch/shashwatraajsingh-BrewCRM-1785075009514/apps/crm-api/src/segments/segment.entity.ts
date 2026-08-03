import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Campaign } from '../campaigns/campaign.entity';

export interface SegmentRule {
  field: string;
  operator: string;
  value: string | number | string[] | number[];
}

@Entity('segments')
export class Segment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description!: string;

  @Column({ type: 'jsonb' })
  rules!: SegmentRule[];

  @Column({ default: 0 })
  customerCount!: number;

  @Column({ default: 'manual' })
  createdBy!: string; // manual | ai

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Campaign, (c) => c.segment)
  campaigns!: Campaign[];
}
