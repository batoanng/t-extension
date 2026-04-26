import type { OptimizeAccess } from '@/shared/model/access';
import {
  ApiErrorResponseSchema,
  type OptimizePromptRequest,
  OptimizePromptRequestSchema,
  type OptimizePromptResponse,
  OptimizePromptResponseSchema,
  PromptApiError,
  getPromptApiErrorMessage,
  isPromptErrorCode,
} from '@/shared/model/prompt';

import { isCanceledRequest, requestJson } from './httpClient';

interface OptimizePromptParams {
  serverBaseUrl: string;
  access: OptimizeAccess;
  payload: OptimizePromptRequest;
  signal?: AbortSignal;
}

export async function optimizePrompt({
  serverBaseUrl,
  access,
  payload,
  signal,
}: OptimizePromptParams): Promise<OptimizePromptResponse> {
  const request = OptimizePromptRequestSchema.parse({
    ...payload,
    credentialMode: access.kind === 'byok' ? 'byok' : 'subscription',
  });
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };

  if (access.kind === 'byok') {
    headers['x-openai-api-key'] = access.apiKey.trim();
  } else {
    headers.authorization = `Bearer ${access.accessToken}`;
  }

  let response: Awaited<ReturnType<typeof requestJson<OptimizePromptResponse>>>;

  try {
    response = await requestJson<OptimizePromptResponse>({
      baseUrl: serverBaseUrl,
      data: request,
      headers,
      method: 'POST',
      pathname: '/api/v1/prompt/optimize',
      signal,
    });
  } catch (error) {
    if (isCanceledRequest(error, signal)) {
      throw new PromptApiError(
        getPromptApiErrorMessage('REQUEST_TIMEOUT'),
        'REQUEST_TIMEOUT',
      );
    }

    throw new PromptApiError(
      getPromptApiErrorMessage('NETWORK_ERROR'),
      'NETWORK_ERROR',
    );
  }

  const data = response.data;

  if (response.status < 200 || response.status >= 300) {
    const parsedError = ApiErrorResponseSchema.safeParse(data);

    if (!parsedError.success) {
      throw new PromptApiError(
        getPromptApiErrorMessage('INVALID_RESPONSE'),
        'INVALID_RESPONSE',
        response.status,
      );
    }

    const code = parsedError.data.error.code;
    const message = isPromptErrorCode(code)
      ? getPromptApiErrorMessage(code)
      : parsedError.data.error.message;

    throw new PromptApiError(
      message,
      isPromptErrorCode(code) ? code : 'INVALID_RESPONSE',
      response.status,
    );
  }

  const parsedResponse = OptimizePromptResponseSchema.safeParse(data);

  if (!parsedResponse.success) {
    throw new PromptApiError(
      getPromptApiErrorMessage('INVALID_RESPONSE'),
      'INVALID_RESPONSE',
      response.status,
    );
  }

  return parsedResponse.data;
}
