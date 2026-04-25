import type { AxiosError } from 'axios';
import { apiClient, useApiQuery } from '@/shared/api';
import {
  CacheKeys,
  sampleGetResponseSchema,
  type SampleGetResponse,
} from '../model';

export function useSampleGetQuery(isEnabled = true) {
  return useApiQuery<SampleGetResponse, AxiosError>({
    queryKey: [CacheKeys.sampleGet],
    queryFn: async () => {
      const { data } = await apiClient.get<unknown>('/sample-get');

      return sampleGetResponseSchema.parse(data);
    },
    options: {
      enabled: isEnabled,
      placeholderData: (previousData) => previousData,
    },
  });
}
