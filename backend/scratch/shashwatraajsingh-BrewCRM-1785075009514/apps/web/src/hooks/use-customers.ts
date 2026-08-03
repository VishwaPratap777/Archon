import { useQuery } from '@tanstack/react-query';
import { getCustomers, getCustomer, getCustomerStats } from '../lib/api';

export function useCustomers(params?: { status?: string; channel?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => getCustomers(params),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id),
    enabled: !!id,
  });
}

export function useCustomerStats() {
  return useQuery({
    queryKey: ['customers', 'stats'],
    queryFn: getCustomerStats,
  });
}
