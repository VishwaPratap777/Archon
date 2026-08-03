import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { SegmentsService } from '../../segments/segments.service';
import { SegmentRule } from '../../segments/segment.entity';

export function createBuildSegmentTool(segmentsService: SegmentsService) {
  const segmentSchema = z.object({
    name: z.string().describe('Name for this segment'),
    description: z.string().describe('Description of what this segment represents'),
    rules: z
      .array(
        z.object({
          field: z.string().describe(
            'Customer field: totalOrders, totalSpent, lastOrderAt, status, preferredChannel, tags, daysSinceLastOrder',
          ),
          operator: z.string().describe(
            'Comparison operator: gte, lte, eq, neq, in, not_in, contains, days_ago_gte, days_ago_lte',
          ),
          value: z.union([z.string(), z.number(), z.array(z.string()), z.array(z.number())]).describe(
            'Value to compare against',
          ),
        }),
      )
      .describe('Array of rules to define the segment. All rules are AND-ed together.'),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tool as any)(
    async (input: z.infer<typeof segmentSchema>) => {
      const rules: SegmentRule[] = input.rules.map((r: { field: string; operator: string; value: string | number | string[] | number[] }) => ({
        field: r.field,
        operator: r.operator,
        value: r.value,
      }));

      const segment = await segmentsService.create({
        name: input.name,
        description: input.description,
        rules,
        createdBy: 'ai',
      });

      const customers = await segmentsService.resolveCustomers(rules);

      return JSON.stringify({
        segmentId: segment.id,
        name: segment.name,
        customerCount: customers.length,
        customers: customers.slice(0, 10).map((c) => ({
          name: c.name,
          email: c.email,
          totalOrders: c.totalOrders,
          totalSpent: Number(c.totalSpent),
          daysSinceLastOrder: c.lastOrderAt
            ? Math.floor((Date.now() - new Date(c.lastOrderAt).getTime()) / (1000 * 60 * 60 * 24))
            : null,
        })),
      });
    },
    {
      name: 'build_segment',
      description:
        'Create a named customer segment from rules. Returns the segment with customer count and sample customers.',
      schema: segmentSchema,
    },
  );
}
