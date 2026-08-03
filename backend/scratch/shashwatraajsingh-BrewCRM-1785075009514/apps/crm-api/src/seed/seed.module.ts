import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Customer } from '../customers/customer.entity';
import { Order } from '../orders/order.entity';
import { Segment } from '../segments/segment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customer, Order, Segment])],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
