import { Controller, Post, Body } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';

class ReceiptDto {
  messageId!: string;
  status!: string;
  timestamp!: string;
  metadata?: Record<string, unknown>;
}

@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post()
  async receive(@Body() dto: ReceiptDto) {
    return this.receiptsService.processReceipt(
      dto.messageId,
      dto.status,
      new Date(dto.timestamp),
      dto.metadata,
    );
  }
}
