import {
  type QueryKey,
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
} from '@tanstack/react-query';

interface UseApiQueryParams<TQueryFnData, TError = Error, TData = TQueryFnData> {
  queryKey: QueryKey;
  queryFn: () => Promise<TQueryFnData>;
  options?: Omit<
    UseQueryOptions<TQueryFnData, TError, TData, QueryKey>,
    'queryKey' | 'queryFn'
  >;
}

export function useApiQuery<TQueryFnData, TError = Error, TData = TQueryFnData>({
  queryKey,
  queryFn,
  options,
}: UseApiQueryParams<TQueryFnData, TError, TData>): UseQueryResult<TData, TError> {
  return useQuery({
    queryKey,
    queryFn,
    ...options,
  });
}
