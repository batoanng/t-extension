import type { GenerationAccess } from '@/shared/model/access';
import { env } from '@/shared/config';
import {
  CreateVisualizationRequestSchema,
  CreateVisualizationResponseSchema,
  type CreateVisualizationRequest,
  type CreateVisualizationResponse,
  VisualizationApiError,
  VisualizationApiErrorResponseSchema,
  getVisualizationApiErrorMessage,
  isVisualizationApiClientErrorCode,
} from '@/shared/model/visualization';

import { generationAccessHeaders } from './accessHeaders';
import { isCanceledRequest, requestJson } from './httpClient';

export interface CreateVisualizationParams {
  access: GenerationAccess;
  payload: CreateVisualizationRequest;
  signal?: AbortSignal;
}

export async function createVisualization({
  access,
  payload,
  signal,
}: CreateVisualizationParams): Promise<CreateVisualizationResponse> {
  const request = CreateVisualizationRequestSchema.parse({
    ...payload,
    credentialMode: access.kind === 'byok' ? 'byok' : 'subscription',
  });

  let response: Awaited<
    ReturnType<typeof requestJson<CreateVisualizationResponse>>
  >;

  try {
    response = await requestJson<CreateVisualizationResponse>({
      baseUrl: env.serverBaseUrl,
      data: request,
      headers: generationAccessHeaders(access),
      method: 'POST',
      pathname: '/api/v1/visualizations',
      signal,
    });
  } catch (error) {
    if (isCanceledRequest(error, signal)) {
      throw new VisualizationApiError(
        getVisualizationApiErrorMessage('REQUEST_TIMEOUT'),
        'REQUEST_TIMEOUT',
      );
    }

    throw new VisualizationApiError(
      getVisualizationApiErrorMessage('NETWORK_ERROR'),
      'NETWORK_ERROR',
    );
  }

  const data = response.data;

  if (response.status < 200 || response.status >= 300) {
    const parsedError = VisualizationApiErrorResponseSchema.safeParse(data);

    if (!parsedError.success) {
      throw new VisualizationApiError(
        getVisualizationApiErrorMessage('INVALID_RESPONSE'),
        'INVALID_RESPONSE',
        response.status,
      );
    }

    const code = parsedError.data.error.code;
    const message = isVisualizationApiClientErrorCode(code)
      ? getVisualizationApiErrorMessage(code)
      : parsedError.data.error.message;

    throw new VisualizationApiError(
      message,
      isVisualizationApiClientErrorCode(code) ? code : 'INVALID_RESPONSE',
      response.status,
    );
  }

  const parsedResponse = CreateVisualizationResponseSchema.safeParse(data);

  if (!parsedResponse.success) {
    throw new VisualizationApiError(
      getVisualizationApiErrorMessage('INVALID_RESPONSE'),
      'INVALID_RESPONSE',
      response.status,
    );
  }

  return parsedResponse.data;
}
