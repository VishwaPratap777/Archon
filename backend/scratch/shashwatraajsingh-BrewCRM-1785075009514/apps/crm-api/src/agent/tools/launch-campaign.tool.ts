import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { CampaignsService } from '../../campaigns/campaigns.service';

export function createLaunchCampaignTool(campaignsService: CampaignsService) {
  const launchSchema = z.object({
    name: z.string().describe('Campaign name'),
    segmentId: z.string().describe('Target segment ID — must be the exact UUID returned by build_segment'),
    channel: z
      .string()
      .describe('Delivery channel (lowercase): email, whatsapp, sms, or rcs'),
    messageTemplate: z
      .string()
      .describe('Message template with {{customer.*}} variables'),
    aiPrompt: z
      .string()
      .optional()
      .nullable()
      .describe('Original natural language prompt that created this campaign'),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async (input: z.infer<typeof launchSchema>) => {
      try {
        // Normalize channel to lowercase
        const channel = input.channel.toLowerCase();

        // Create the campaign
        const campaign = await campaignsService.create({
          name: input.name,
          segmentId: input.segmentId,
          channel,
          messageTemplate: input.messageTemplate,
          aiPrompt: input.aiPrompt || undefined,
        });

        // Launch it
        const launched = await campaignsService.launch(campaign.id);

        return JSON.stringify({
          campaignId: launched.id,
          status: launched.status,
          totalCount: launched.totalCount,
          message: `Campaign "${launched.name}" launched successfully! ${launched.totalCount} messages are being sent via ${launched.channel}.`,
        });
      } catch (err: unknown) {
        // Return the error as a tool result instead of throwing.
        // This prevents LangGraph from retrying in a loop and lets the
        // AI report the error to the user clearly.
        const errorMessage = err instanceof Error ? err.message : String(err);
        return JSON.stringify({
          error: true,
          message: `Failed to launch campaign: ${errorMessage}`,
          suggestion: 'Please check that the segmentId is valid and try again.',
        });
      }
    },
    {
      name: 'launch_campaign',
      description:
        'Create and launch a campaign. ONLY call this after the user has explicitly confirmed they want to send.\nThe segmentId MUST be the exact UUID value returned by build_segment.\nThe channel must be lowercase (email, whatsapp, sms, or rcs).\nDo not generate or modify the segmentId.',
      schema: launchSchema,
    },
  );
}
