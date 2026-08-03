import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';

class CreateCampaignDto {
  name!: string;
  segmentId!: string;
  channel!: string;
  messageTemplate!: string;
  aiPrompt?: string;
  scheduledAt?: string;
}

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  async findAll() {
    return this.campaignsService.findAll();
  }

  @Post()
  async create(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Post(':id/launch')
  async launch(@Param('id') id: string) {
    return this.campaignsService.launch(id);
  }

  @Get(':id/messages')
  async getMessages(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.campaignsService.getMessages(id, {
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }
}
