import { StatsCards } from '@/components/dashboard/stats-cards';
import { RecentCampaigns } from '@/components/dashboard/recent-campaigns';

export default function DashboardPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your customers and campaigns.</p>
      </div>
      
      <StatsCards />
      <RecentCampaigns />
    </div>
  );
}
