'use client';

import { Campaign } from '@/lib/types';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface CampaignChartProps {
  campaign: Campaign;
}

export function CampaignChart({ campaign }: CampaignChartProps) {
  const data = [
    { name: 'Target', value: campaign.totalCount },
    { name: 'Sent', value: campaign.sentCount },
    { name: 'Delivered', value: campaign.deliveredCount },
    { name: 'Opened', value: campaign.openedCount },
    { name: 'Clicked', value: campaign.clickedCount },
  ];

  return (
    <div className="glass-panel border border-border/50 rounded-lg p-6 mb-8">
      <h3 className="text-sm font-medium text-foreground mb-6">Delivery Funnel</h3>
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="name" 
              stroke="#888888" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
