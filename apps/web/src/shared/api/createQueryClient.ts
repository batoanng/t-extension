import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';
import { AxiosError } from 'axios';

const EMPTY_CONFIG: QueryClientConfig = {
  defaultOptions: {
    queries: {},
    mutations: {},
  },
};

export function createQueryClient(
  config: QueryClientConfig = EMPTY_CONFIG,
): QueryClient {
  const queries = config.defaultOptions?.queries ?? {};
  const mutations = config.defaultOptions?.mutations ?? {};

  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 15 * 60_000,
        retryDelay: (failureCount) => Math.pow(2, failureCount) * 1000,
        retry: (_, error: unknown) => {
          if (error instanceof AxiosError && error.code === AxiosError.ERR_NETWORK) {
            return false;
          }

          const status =
            error instanceof AxiosError ? error.response?.status ?? null : null;

          return (
            status == null ||
            status < 308 ||
            status === 408 ||
            status === 409
          );
        },
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        ...queries,
      },
      mutations,
    },
  });
}

export const queryClient = createQueryClient();
