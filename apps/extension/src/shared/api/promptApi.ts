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

interface OptimizePromptParams {
  serverBaseUrl: string;
  access: OptimizeAccess;
  payload: OptimizePromptRequest;
  signal?: AbortSignal;
}

function joinUrl(baseUrl: string, pathname: string): string {
  return new URL(pathname, `${baseUrl.replace(/\/+$/, '')}/`).toString();
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new PromptApiError(
      getPromptApiErrorMessage('INVALID_RESPONSE'),
      'INVALID_RESPONSE',
      response.status,
    );
  }
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

  let response: Response;

  try {
    response = await fetch(joinUrl(serverBaseUrl, '/api/v1/prompt/optimize'), {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal,
    });
  } catch {
    if (signal?.aborted) {
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

  const data = await readJson(response);

  if (!response.ok) {
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
