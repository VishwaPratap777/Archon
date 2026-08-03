import { Module } from '@nestjs/common';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { SegmentsModule } from '../segments/segments.module';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [SegmentsModule, CampaignsModule],
  controllers: [AgentController],
  providers: [AgentService],
})
export class AgentModule {}
