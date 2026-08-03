'use client';

import { useCustomerStats } from '@/hooks/use-customers';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function StatsCards() {
  const { data: stats, isLoading } = useCustomerStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full bg-secondary/50 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="glass-panel rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.04]">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total Customers</div>
        <div className="text-3xl font-semibold text-foreground mt-2">{stats.total}</div>
      </div>
      <div className="glass-panel rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.04]">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Active Customers</div>
        <div className="text-3xl font-semibold text-foreground mt-2">{stats.active}</div>
      </div>
      <div className="glass-panel rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.04] relative overflow-hidden">
        <div className="text-xs font-semibold text-amber-500 uppercase tracking-widest">At Risk</div>
        <div className="text-3xl font-semibold text-amber-400 mt-2 relative z-10">{stats.at_risk}</div>
        <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent pointer-events-none" />
      </div>
      <div className="glass-panel rounded-2xl p-6 transition-all duration-300 hover:scale-[1.02] hover:bg-white/[0.04]">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Avg Order Value</div>
        <div className="text-3xl font-semibold text-foreground mt-2">{formatCurrency(stats.avgOrderValue)}</div>
      </div>
    </div>
  );
}
