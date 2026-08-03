import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { SeedService } from '../seed/seed.service';

@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly seedService: SeedService,
  ) {}

  @Get('stats')
  async getStats() {
    return this.customersService.getStats();
  }

  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.customersService.findAll({
      status,
      channel,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post('seed')
  async seed() {
    await this.seedService.seed();
    return { message: 'Seed completed' };
  }
}
