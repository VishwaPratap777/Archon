import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { SegmentsService } from '../../segments/segments.service';

export function createEstimateReachTool(segmentsService: SegmentsService) {
  const reachSchema = z.object({
    segmentId: z.string().describe('The segment ID to estimate reach for'),
    channel: z.string().describe('The delivery channel: email, whatsapp, sms, or rcs'),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async (input: z.infer<typeof reachSchema>) => {
      const segment = await segmentsService.findOne(input.segmentId);
      const reach = segment.customerCount;

      // Apply delivery rate constants
      const deliveredRate = 0.9;
      const openedRate = 0.45;
      const clickedRate = 0.3;

      const estimatedDelivered = Math.round(reach * deliveredRate);
      const estimatedOpened = Math.round(estimatedDelivered * openedRate);
      const estimatedClicked = Math.round(estimatedOpened * clickedRate);

      const channelNotes: Record<string, string> = {
        email: 'Email has moderate open rates. Best for longer, content-rich messages with links.',
        whatsapp: 'WhatsApp has the highest open rates (~90%). Great for short, conversational messages.',
        sms: 'SMS has high delivery rates but limited content. Best for urgent, short messages.',
        rcs: 'RCS supports rich media but has limited device support. Good for interactive campaigns.',
      };

      return JSON.stringify({
        reach,
        estimatedDelivered,
        estimatedOpened,
        estimatedClicked,
        channelNote: channelNotes[input.channel] || 'Channel engagement varies.',
      });
    },
    {
      name: 'estimate_reach',
      description:
        'Estimate how many customers a segment would reach and predicted campaign performance.',
      schema: reachSchema,
    },
  );
}
