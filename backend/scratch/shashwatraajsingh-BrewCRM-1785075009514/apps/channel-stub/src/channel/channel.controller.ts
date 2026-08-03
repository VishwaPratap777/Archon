import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { ChannelService } from './channel.service';

class SendDto {
  messageId!: string;
  recipient!: { email: string; phone: string; name: string };
  channel!: string;
  text!: string;
}

@Controller()
export class ChannelController {
  constructor(private readonly channelService: ChannelService) {}

  @Post('send')
  @HttpCode(202)
  async send(@Body() dto: SendDto) {
    await this.channelService.enqueueSend(dto);
    return { accepted: true };
  }
}
