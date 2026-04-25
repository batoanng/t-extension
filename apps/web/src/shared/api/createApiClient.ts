import axios, { type AxiosInstance, type CreateAxiosDefaults } from 'axios';
import { env } from '@/shared/config';

export function createApiClient(
  config: CreateAxiosDefaults = {},
): AxiosInstance {
  const { baseURL = env.apiBaseUrl, headers, ...restConfig } = config;

  return axios.create({
    baseURL,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
    ...restConfig,
  });
}

export const apiClient = createApiClient();
