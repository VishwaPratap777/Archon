'use client';

import { useCampaigns, useLaunchCampaign } from '@/hooks/use-campaigns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export function CampaignsTable() {
  const { data: campaigns, isLoading } = useCampaigns();
  const { mutate: launch, isPending: isLaunching } = useLaunchCampaign();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl overflow-hidden mt-6">
        <div className="p-6 space-y-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-secondary/50" />
          ))}
        </div>
      </div>
    );
  }

  const handleLaunch = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    launch(id, {
      onSuccess: () => toast.success('Campaign launched successfully'),
      onError: () => toast.error('Failed to launch campaign')
    });
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6 mt-6">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">All Campaigns</h2>
        <Button onClick={() => router.push('/chat')} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105 rounded-full px-6">
          <Sparkles className="w-4 h-4 mr-2" /> Use Co-pilot
        </Button>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <Table>
          <TableHeader className="bg-secondary/5">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Name</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Channel</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Status</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-widest font-semibold text-right">Reach</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-widest font-semibold text-right">Delivered</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-widest font-semibold text-right">Opened</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Created</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-widest font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns?.length === 0 ? (
              <TableRow className="border-border/50 hover:bg-secondary/5">
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No campaigns found. Use the Co-pilot to create one.
                </TableCell>
              </TableRow>
            ) : (
              campaigns?.map((campaign) => {
                const deliveredPercent = campaign.totalCount ? Math.round((campaign.deliveredCount / campaign.totalCount) * 100) : 0;
                const openedPercent = campaign.deliveredCount ? Math.round((campaign.openedCount / campaign.deliveredCount) * 100) : 0;

                return (
                  <TableRow 
                    key={campaign.id} 
                    className="border-border/50 hover:bg-white/[0.03] cursor-pointer transition-colors"
                    onClick={() => router.push(`/campaigns/${campaign.id}`)}
                  >
                    <TableCell>
                      <div className="font-semibold text-foreground">{campaign.name}</div>
                      {campaign.segment?.name && <div className="text-xs text-muted-foreground">{campaign.segment.name}</div>}
                    </TableCell>
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
                    <TableCell className="text-right text-muted-foreground font-medium">{campaign.totalCount}</TableCell>
                    <TableCell className="text-right text-muted-foreground font-medium">{deliveredPercent}%</TableCell>
                    <TableCell className="text-right text-muted-foreground font-medium">{openedPercent}%</TableCell>
                    <TableCell className="text-muted-foreground font-medium text-sm">
                      {format(new Date(campaign.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {campaign.status === 'draft' ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 h-8 rounded-lg transition-colors">
                              <Send className="w-3.5 h-3.5 mr-1.5" /> Launch
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="glass-panel border-border/50">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-foreground">Launch Campaign?</AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                This will send messages to {campaign.totalCount} customers via {campaign.channel}. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-transparent text-foreground border-border/50 hover:bg-secondary/50">Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={(e) => handleLaunch(e as any, campaign.id)}
                                disabled={isLaunching}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                              >
                                {isLaunching ? 'Launching...' : 'Yes, Launch'}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground h-8 rounded-lg" onClick={() => router.push(`/campaigns/${campaign.id}`)}>
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
