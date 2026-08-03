'use client';

import { useState } from 'react';
import { useCustomers } from '@/hooks/use-customers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function CustomersTable() {
  const [status, setStatus] = useState<string>('all');
  const [channel, setChannel] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 50;
  
  const { data, isLoading } = useCustomers({ 
    status: status === 'all' ? undefined : status,
    channel: channel === 'all' ? undefined : channel,
    limit,
    offset: (page - 1) * limit
  });

  if (isLoading) {
    return (
      <div className="glass-panel border border-border/50 rounded-lg overflow-hidden mt-6">
        <div className="p-4 space-y-4">
          {[...Array(10)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-secondary/50" />
          ))}
        </div>
      </div>
    );
  }

  const customers = data?.data || [];

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 mt-6">
        <Tabs value={status} onValueChange={(val) => { setStatus(val); setPage(1); }} className="w-[400px]">
          <TabsList className="glass-panel border border-border">
            <TabsTrigger value="all" className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-muted-foreground">All Status</TabsTrigger>
            <TabsTrigger value="active" className="data-[state=active]:bg-secondary data-[state=active]:text-green-400 text-muted-foreground">Active</TabsTrigger>
            <TabsTrigger value="at_risk" className="data-[state=active]:bg-secondary data-[state=active]:text-amber-400 text-muted-foreground">At Risk</TabsTrigger>
            <TabsTrigger value="churned" className="data-[state=active]:bg-secondary data-[state=active]:text-red-400 text-muted-foreground">Churned</TabsTrigger>
          </TabsList>
        </Tabs>

        <Tabs value={channel} onValueChange={(val) => { setChannel(val); setPage(1); }} className="w-[400px]">
          <TabsList className="glass-panel border border-border w-full">
            <TabsTrigger value="all" className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-muted-foreground flex-1">All Channels</TabsTrigger>
            <TabsTrigger value="whatsapp" className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-muted-foreground flex-1">WhatsApp</TabsTrigger>
            <TabsTrigger value="email" className="data-[state=active]:bg-secondary data-[state=active]:text-foreground text-muted-foreground flex-1">Email</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="glass-panel border border-border/50 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-white/3">
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Customer</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Status</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium text-right">Orders</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium text-right">Total Spent</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Last Order</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Channel</TableHead>
              <TableHead className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow className="border-border/50 hover:bg-white/3">
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No customers found matching these filters.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id} className="border-border/50 hover:bg-white/3">
                  <TableCell>
                    <div className="font-medium text-foreground">{customer.name}</div>
                    <div className="text-xs text-muted-foreground">{customer.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={
                        customer.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        customer.status === 'at_risk' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                      }
                    >
                      {customer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{customer.totalOrders}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatCurrency(Number(customer.totalSpent))}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {customer.lastOrderAt ? formatDistanceToNow(new Date(customer.lastOrderAt), { addSuffix: true }) : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={
                        customer.preferredChannel === 'whatsapp' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                        customer.preferredChannel === 'email' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        customer.preferredChannel === 'sms' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }
                    >
                      {customer.preferredChannel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap max-w-[150px]">
                      {customer.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded border border-border/50">
                          {tag}
                        </span>
                      ))}
                      {customer.tags.length > 2 && (
                        <span className="text-[10px] text-muted-foreground px-1">+{customer.tags.length - 2}</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {data?.total ? (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.total)} of {data.total} customers
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page * limit >= data.total}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
