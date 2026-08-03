import { CustomersTable } from '@/components/customers/customers-table';

export default function CustomersPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-foreground">Customers</h1>
        <p className="text-sm text-muted-foreground mt-1">View and filter your entire customer base.</p>
      </div>
      
      <CustomersTable />
    </div>
  );
}
