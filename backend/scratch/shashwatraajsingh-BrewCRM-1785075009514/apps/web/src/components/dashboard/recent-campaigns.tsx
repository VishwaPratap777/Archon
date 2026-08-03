'use client';

import { useCampaigns } from '@/hooks/use-campaigns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

export function RecentCampaigns() {
  const { data: campaigns, isLoading } = useCampaigns();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border/50 bg-secondary/10">
          <h2 className="text-lg font-semibold text-foreground">Recent Campaigns</h2>
        </div>
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-secondary/50" />
          ))}
        </div>
      </div>
    );
  }

  const recent = campaigns?.slice(0, 5) || [];

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-border/50 bg-secondary/10">
        <h2 className="text-lg font-semibold text-foreground">Recent Campaigns</h2>
      </div>
      <Table>
        <TableHeader className="bg-secondary/5">
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Name</TableHead>
            <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Channel</TableHead>
            <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Status</TableHead>
            <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium text-right">Sent</TableHead>
            <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium text-right">Delivered</TableHead>
            <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium text-right">Opened</TableHead>
            <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recent.length === 0 ? (
            <TableRow className="border-border/50 hover:bg-white/3">
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No campaigns found.
              </TableCell>
            </TableRow>
          ) : (
            recent.map((campaign) => (
              <TableRow 
                key={campaign.id} 
                className="border-border/50 hover:bg-white/[0.03] cursor-pointer transition-colors"
                onClick={() => router.push(`/campaigns/${campaign.id}`)}
              >
                <TableCell className="font-semibold text-foreground">{campaign.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-secondary/50 text-secondary-foreground border-border/50 uppercase text-[10px] tracking-wider font-semibold">
                    {campaign.channel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={
                      campaign.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-semibold' :
                      campaign.status === 'sending' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20 font-semibold' :
                      campaign.status === 'failed' ? 'bg-destructive/10 text-destructive-foreground border-destructive/20 font-semibold' :
                      'bg-muted text-muted-foreground border-border/50 font-semibold'
                    }
                  >
                    {campaign.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground font-medium">{campaign.sentCount}</TableCell>
                <TableCell className="text-right text-muted-foreground font-medium">{campaign.deliveredCount}</TableCell>
                <TableCell className="text-right text-muted-foreground font-medium">{campaign.openedCount}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {format(new Date(campaign.createdAt), 'MMM d, yyyy')}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
