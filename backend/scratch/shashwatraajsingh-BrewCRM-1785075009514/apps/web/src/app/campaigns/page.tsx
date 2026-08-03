import { CampaignsTable } from '@/components/campaigns/campaigns-table';

export default function CampaignsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Campaigns</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage, monitor, and launch your messaging campaigns.</p>
      </div>
      
      <CampaignsTable />
    </div>
  );
}
