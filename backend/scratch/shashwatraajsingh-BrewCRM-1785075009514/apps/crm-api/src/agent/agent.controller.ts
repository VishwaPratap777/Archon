import { Controller, Post, Body } from '@nestjs/common';
import { AgentService } from './agent.service';

class ChatDto {
  messages!: Array<{ role: string; content: string }>;
  sessionId!: string;
}

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('chat')
  async chat(@Body() dto: ChatDto) {
    return this.agentService.chat(dto.messages, dto.sessionId);
  }
}
