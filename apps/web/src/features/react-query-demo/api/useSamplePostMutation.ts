import { useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { apiClient, useApiMutation } from '@/shared/api';
import {
  CacheKeys,
  samplePostResponseSchema,
  type SamplePostRequest,
  type SamplePostResponse,
} from '../model';

export function useSamplePostMutation() {
  const queryClient = useQueryClient();

  return useApiMutation<SamplePostResponse, SamplePostRequest, AxiosError>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<unknown>('/sample-post', payload);

      return samplePostResponseSchema.parse(data);
    },
    options: {
      mutationKey: [CacheKeys.samplePost],
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: [CacheKeys.sampleGet],
        });
      },
    },
  });
}
