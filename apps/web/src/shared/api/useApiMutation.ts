import {
  type UseMutationOptions,
  type UseMutationResult,
  useMutation,
} from '@tanstack/react-query';
import type { AxiosError } from 'axios';

interface UseApiMutationParams<
  TData,
  TVariables,
  TError = AxiosError,
  TOnMutateResult = unknown,
> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  options?: Omit<
    UseMutationOptions<TData, TError, TVariables, TOnMutateResult>,
    'mutationFn'
  >;
}

export function useApiMutation<
  TData,
  TVariables,
  TError = AxiosError,
  TOnMutateResult = unknown,
>({
  mutationFn,
  options,
}: UseApiMutationParams<TData, TVariables, TError, TOnMutateResult>): UseMutationResult<
  TData,
  TError,
  TVariables,
  TOnMutateResult
> {
  return useMutation({
    mutationFn,
    ...options,
  });
}
