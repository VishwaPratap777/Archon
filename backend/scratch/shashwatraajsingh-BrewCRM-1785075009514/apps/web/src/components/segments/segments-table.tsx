'use client';

import { useState } from 'react';
import { useSegments, useDeleteSegment } from '@/hooks/use-segments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Sparkles, Trash2 } from 'lucide-react';
import { CreateSegmentDialog } from './create-segment-dialog';
import { toast } from 'sonner';

export function SegmentsTable() {
  const { data: segments, isLoading } = useSegments();
  const { mutate: deleteSegment, isPending: isDeleting } = useDeleteSegment();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete segment "${name}"?`)) {
      setDeleteId(id);
      deleteSegment(id, {
        onSuccess: () => toast.success('Segment deleted'),
        onError: () => toast.error('Failed to delete segment'),
        onSettled: () => setDeleteId(null),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="glass-panel border border-border/50 rounded-lg overflow-hidden mt-6">
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-secondary/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6 mt-6">
        <h2 className="text-lg font-medium text-foreground">All Segments</h2>
        <CreateSegmentDialog />
      </div>

      <div className="glass-panel border border-border/50 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-white/3">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Name</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Description</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium text-right">Customers</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Created By</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Created At</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segments?.length === 0 ? (
              <TableRow className="border-border/50 hover:bg-white/3">
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No segments found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              segments?.map((segment) => (
                <TableRow key={segment.id} className="border-border/50 hover:bg-white/3">
                  <TableCell className="font-medium text-foreground">{segment.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">{segment.description || '-'}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{segment.customerCount}</TableCell>
                  <TableCell>
                    {segment.createdBy === 'ai' ? (
                      <span className="flex items-center gap-1.5 text-xs text-primary bg-indigo-500/10 px-2 py-1 rounded-md w-fit border border-indigo-500/20">
                        <Sparkles className="w-3 h-3" />
                        AI Generated
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md w-fit border border-border">
                        Manual
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(segment.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(segment.id, segment.name)}
                      disabled={isDeleting && deleteId === segment.id}
                      className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
