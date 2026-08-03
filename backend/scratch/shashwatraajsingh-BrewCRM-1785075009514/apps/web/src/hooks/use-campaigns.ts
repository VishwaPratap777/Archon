import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCampaigns, getCampaign, createCampaign, launchCampaign, getCampaignMessages } from '../lib/api';

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: getCampaigns,
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ['campaign', id],
    queryFn: () => getCampaign(id),
    enabled: !!id,
    // Poll every 3 seconds if status is sending
    refetchInterval: (query) => {
      const state = query.state.data;
      return state?.status === 'sending' ? 3000 : false;
    },
  });
}

export function useCampaignMessages(id: string, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['campaign', id, 'messages', params],
    queryFn: () => getCampaignMessages(id, params),
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

export function useLaunchCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: launchCampaign,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign', variables] });
    },
  });
}
