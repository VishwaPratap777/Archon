'use client';

import { Campaign } from '@/lib/types';

interface CampaignStatsProps {
  campaign: Campaign;
}

export function CampaignStats({ campaign }: CampaignStatsProps) {
  const stats = [
    { label: 'Sent', count: campaign.sentCount, total: campaign.totalCount },
    { label: 'Delivered', count: campaign.deliveredCount, total: campaign.sentCount || campaign.totalCount },
    { label: 'Failed', count: campaign.failedCount, total: campaign.sentCount || campaign.totalCount },
    { label: 'Opened', count: campaign.openedCount, total: campaign.deliveredCount },
    { label: 'Clicked', count: campaign.clickedCount, total: campaign.openedCount },
    { label: 'Ordered', count: campaign.ordersCount, total: campaign.clickedCount },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
      {stats.map((stat, i) => {
        const percent = stat.total > 0 ? Math.round((stat.count / stat.total) * 100) : 0;
        
        return (
          <div key={i} className="glass-panel border border-border/50 rounded-lg p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{stat.label}</div>
            <div className="text-2xl font-semibold text-foreground">{stat.count}</div>
            <div className="text-sm mt-1 text-muted-foreground">{percent}%</div>
          </div>
        );
      })}
    </div>
  );
}
