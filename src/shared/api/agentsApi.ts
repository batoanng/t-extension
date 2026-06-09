import { env } from '@/shared/config';
import {
  type Agent,
  AgentListResponseSchema,
  GenerationApiError,
  getGenerationApiErrorMessage,
} from '@/shared/model/contextPack';

import { isCanceledRequest, requestJson } from './httpClient';

export interface FetchAgentsParams {
  signal?: AbortSignal;
}

export async function fetchAgents({
  signal,
}: FetchAgentsParams = {}): Promise<Agent[]> {
  let response: Awaited<ReturnType<typeof requestJson<unknown>>>;

  try {
    response = await requestJson<unknown>({
      baseUrl: env.serverBaseUrl,
      method: 'GET',
      pathname: '/api/v1/agents',
      signal,
    });
  } catch (error) {
    if (isCanceledRequest(error, signal)) {
      throw new GenerationApiError(
        getGenerationApiErrorMessage('REQUEST_TIMEOUT'),
        'REQUEST_TIMEOUT',
      );
    }

    throw new GenerationApiError(
      getGenerationApiErrorMessage('NETWORK_ERROR'),
      'NETWORK_ERROR',
    );
  }

  if (response.status < 200 || response.status >= 300) {
    throw new GenerationApiError(
      getGenerationApiErrorMessage('INVALID_RESPONSE'),
      'INVALID_RESPONSE',
      response.status,
    );
  }

  const parsed = AgentListResponseSchema.safeParse(response.data);

  if (!parsed.success) {
    throw new GenerationApiError(
      getGenerationApiErrorMessage('INVALID_RESPONSE'),
      'INVALID_RESPONSE',
      response.status,
    );
  }

  return parsed.data.agents;
}
