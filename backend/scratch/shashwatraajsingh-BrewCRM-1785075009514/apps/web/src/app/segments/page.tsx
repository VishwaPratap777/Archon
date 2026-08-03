import { SegmentsTable } from '@/components/segments/segments-table';

export default function SegmentsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-foreground">Segments</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage and create target audiences for your campaigns.</p>
      </div>
      
      <SegmentsTable />
    </div>
  );
}
