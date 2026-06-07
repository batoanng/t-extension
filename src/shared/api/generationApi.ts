import type { GenerationAccess } from '@/shared/model/access';
import { env } from '@/shared/config';
import {
  ApiErrorResponseSchema,
  type GenerateBriefRequest,
  GenerateBriefRequestSchema,
  type GenerateBriefResponse,
  GenerateBriefResponseSchema,
  GenerationApiError,
  getGenerationApiErrorMessage,
  isGenerationErrorCode,
} from '@/shared/model/contextPack';

import { generationAccessHeaders } from './accessHeaders';
import { isCanceledRequest, requestJson } from './httpClient';

export interface GenerateBriefParams {
  access: GenerationAccess;
  payload: GenerateBriefRequest;
  signal?: AbortSignal;
}

export async function generateBrief({
  access,
  payload,
  signal,
}: GenerateBriefParams): Promise<GenerateBriefResponse> {
  const request = GenerateBriefRequestSchema.parse({
    ...payload,
    credentialMode: access.kind === 'byok' ? 'byok' : 'subscription',
  });

  let response: Awaited<ReturnType<typeof requestJson<GenerateBriefResponse>>>;

  try {
    response = await requestJson<GenerateBriefResponse>({
      baseUrl: env.serverBaseUrl,
      data: request,
      headers: generationAccessHeaders(access),
      method: 'POST',
      pathname: '/api/v1/generations',
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

  const data = response.data;

  if (response.status < 200 || response.status >= 300) {
    const parsedError = ApiErrorResponseSchema.safeParse(data);

    if (!parsedError.success) {
      throw new GenerationApiError(
        getGenerationApiErrorMessage('INVALID_RESPONSE'),
        'INVALID_RESPONSE',
        response.status,
      );
    }

    const code = parsedError.data.error.code;
    const message = isGenerationErrorCode(code)
      ? getGenerationApiErrorMessage(code)
      : parsedError.data.error.message;

    throw new GenerationApiError(
      message,
      isGenerationErrorCode(code) ? code : 'INVALID_RESPONSE',
      response.status,
    );
  }

  const parsedResponse = GenerateBriefResponseSchema.safeParse(data);

  if (!parsedResponse.success) {
    throw new GenerationApiError(
      getGenerationApiErrorMessage('INVALID_RESPONSE'),
      'INVALID_RESPONSE',
      response.status,
    );
  }

  return parsedResponse.data;
}
