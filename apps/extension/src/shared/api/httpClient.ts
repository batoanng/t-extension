import axios from 'axios';
import type { Method } from 'axios';

interface RequestJsonParams {
  baseUrl: string;
  pathname: string;
  method?: Method;
  data?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  signal?: AbortSignal;
}

interface JsonResponse<T> {
  data: T | null;
  status: number;
}

export function joinUrl(baseUrl: string, pathname: string): string {
  return new URL(pathname, `${baseUrl.replace(/\/+$/, '')}/`).toString();
}

export function isCanceledRequest(
  error: unknown,
  signal?: AbortSignal,
): boolean {
  return Boolean(
    signal?.aborted ||
    (axios.isAxiosError(error) && error.code === 'ERR_CANCELED'),
  );
}

export async function requestJson<T>({
  baseUrl,
  pathname,
  method = 'GET',
  data,
  headers,
  params,
  signal,
}: RequestJsonParams): Promise<JsonResponse<T>> {
  const response = await axios.request<T | null>({
    data,
    headers,
    method,
    params,
    signal,
    url: joinUrl(baseUrl, pathname),
    validateStatus: () => true,
  });

  return {
    data: response.data ?? null,
    status: response.status,
  };
}
