'use client';

import { useCampaignMessages } from '@/hooks/use-campaigns';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface MessagesTableProps {
  campaignId: string;
}

export function MessagesTable({ campaignId }: MessagesTableProps) {
  // Pass refetch interval dynamically if we wanted to
  const { data, isLoading } = useCampaignMessages(campaignId, { limit: 50 });

  if (isLoading) {
    return (
      <div className="glass-panel border border-border/50 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border/50">
          <h2 className="text-lg font-medium text-foreground">Message Log</h2>
        </div>
        <div className="p-4 space-y-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-secondary/50" />
          ))}
        </div>
      </div>
    );
  }

  const messages = data?.data || [];

  return (
    <div className="glass-panel border border-border/50 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <h2 className="text-lg font-medium text-foreground">Message Log</h2>
      </div>
      <Table>
        <TableHeader className="bg-white/3">
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Customer</TableHead>
            <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Channel</TableHead>
            <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Status</TableHead>
            <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium text-right">Sent At</TableHead>
            <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium text-right">Delivered At</TableHead>
            <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium text-right">Opened At</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.length === 0 ? (
            <TableRow className="border-border/50 hover:bg-white/3">
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No messages found.
              </TableCell>
            </TableRow>
          ) : (
            messages.map((message) => (
              <TableRow key={message.id} className="border-border/50 hover:bg-white/3">
                <TableCell className="font-medium text-foreground">{message.customer?.name || 'Unknown'}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-secondary/50 text-muted-foreground border-border uppercase text-[10px]">
                    {message.channel}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={
                      ['delivered', 'completed'].includes(message.status) ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      ['sending', 'sent'].includes(message.status) ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      ['opened'].includes(message.status) ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      ['failed'].includes(message.status) ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      ['clicked', 'ordered'].includes(message.status) ? 'bg-indigo-500/10 text-primary border-indigo-500/20' :
                      'bg-neutral-500/10 text-muted-foreground border-neutral-500/20'
                    }
                  >
                    {message.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">
                  {message.sentAt ? format(new Date(message.sentAt), 'MMM d, HH:mm:ss') : '-'}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">
                  {message.deliveredAt ? format(new Date(message.deliveredAt), 'MMM d, HH:mm:ss') : '-'}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">
                  {message.openedAt ? format(new Date(message.openedAt), 'MMM d, HH:mm:ss') : '-'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
