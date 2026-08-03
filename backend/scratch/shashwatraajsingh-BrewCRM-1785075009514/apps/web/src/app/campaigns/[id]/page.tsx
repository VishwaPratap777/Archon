'use client';

import { useCampaign, useLaunchCampaign } from '@/hooks/use-campaigns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { CampaignStats } from '@/components/campaigns/campaign-stats';
import { CampaignChart } from '@/components/campaigns/campaign-chart';
import { MessagesTable } from '@/components/campaigns/messages-table';
import { Send, ArrowLeft, Activity } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const { data: campaign, isLoading } = useCampaign(params.id);
  const { mutate: launch, isPending: isLaunching } = useLaunchCampaign();

  if (isLoading || !campaign) {
    return (
      <div className="p-8 max-w-7xl mx-auto w-full">
        <div className="flex gap-4 mb-8">
          <Skeleton className="h-8 w-64 bg-secondary/50" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 bg-secondary/50" />)}
        </div>
        <Skeleton className="h-[250px] w-full bg-secondary/50 mb-8" />
        <Skeleton className="h-64 w-full bg-secondary/50" />
      </div>
    );
  }

  const handleLaunch = () => {
    if (confirm(`Launch campaign to ${campaign.totalCount} customers via ${campaign.channel}?`)) {
      launch(campaign.id, {
        onSuccess: () => toast.success('Campaign launched successfully'),
        onError: () => toast.error('Failed to launch campaign')
      });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <Link href="/campaigns" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 w-fit mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to campaigns
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-semibold text-foreground">{campaign.name}</h1>
              {campaign.status === 'sending' && (
                <span className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                  <Activity className="w-3 h-3 animate-pulse" /> Live
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant="outline" 
                className={
                  campaign.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  campaign.status === 'sending' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  campaign.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                  'bg-neutral-500/10 text-muted-foreground border-neutral-500/20'
                }
              >
                {campaign.status}
              </Badge>
              <Badge variant="outline" className="bg-secondary/50 text-muted-foreground border-border uppercase text-[10px]">
                {campaign.channel}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Created {format(new Date(campaign.createdAt), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
          
          {campaign.status === 'draft' && (
            <Button 
              onClick={handleLaunch} 
              disabled={isLaunching}
              className="bg-primary hover:bg-primary/90 text-foreground"
            >
              <Send className="w-4 h-4 mr-2" /> 
              {isLaunching ? 'Launching...' : 'Launch Campaign'}
            </Button>
          )}
        </div>
      </div>

      <CampaignStats campaign={campaign} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <CampaignChart campaign={campaign} />
        </div>
        <div className="glass-panel border border-border/50 rounded-lg p-6 h-[fit-content]">
          <h3 className="text-sm font-medium text-foreground mb-4">Message Template</h3>
          <pre className="bg-card p-4 rounded-md border border-border/50 text-sm text-muted-foreground whitespace-pre-wrap font-mono">
            {campaign.messageTemplate}
          </pre>
          {campaign.aiPrompt && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-foreground mb-2">Original Prompt</h3>
              <p className="text-sm text-muted-foreground italic">"{campaign.aiPrompt}"</p>
            </div>
          )}
        </div>
      </div>

      <MessagesTable campaignId={campaign.id} />
    </div>
  );
}
