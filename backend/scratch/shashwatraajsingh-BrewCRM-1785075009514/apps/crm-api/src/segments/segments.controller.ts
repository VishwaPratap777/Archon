import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { SegmentsService } from './segments.service';
import { SegmentRule } from './segment.entity';

class CreateSegmentDto {
  name!: string;
  description?: string;
  rules!: SegmentRule[];
  createdBy?: string;
}

@Controller('segments')
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Get()
  async findAll() {
    return this.segmentsService.findAll();
  }

  @Post()
  async create(@Body() dto: CreateSegmentDto) {
    return this.segmentsService.create(dto);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.segmentsService.findOneWithCustomers(id, {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.segmentsService.remove(id);
    return { deleted: true };
  }

  @Post(':id/refresh')
  async refresh(@Param('id') id: string) {
    return this.segmentsService.refreshCount(id);
  }
}
