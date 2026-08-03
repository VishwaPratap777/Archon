import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSegments, getSegment, createSegment, deleteSegment } from '../lib/api';

export function useSegments() {
  return useQuery({
    queryKey: ['segments'],
    queryFn: getSegments,
  });
}

export function useSegment(id: string) {
  return useQuery({
    queryKey: ['segment', id],
    queryFn: () => getSegment(id),
    enabled: !!id,
  });
}

export function useCreateSegment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createSegment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
}

export function useDeleteSegment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteSegment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
    },
  });
}
