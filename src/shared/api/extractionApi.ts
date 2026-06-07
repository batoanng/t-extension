import type { GenerationAccess } from '@/shared/model/access';
import {
  ExtractionApiError,
  ExtractionApiErrorResponseSchema,
  type ExtractMarkdownRequest,
  ExtractMarkdownRequestSchema,
  type ExtractMarkdownResponse,
  ExtractMarkdownResponseSchema,
  getExtractionApiErrorMessage,
  isExtractionApiClientErrorCode,
} from '@/shared/model/extraction';

import { isCanceledRequest, requestJson } from './httpClient';

export interface ExtractMarkdownParams {
  access: GenerationAccess;
  payload: ExtractMarkdownRequest;
  serverBaseUrl: string;
  signal?: AbortSignal;
}

export async function extractMarkdown({
  access,
  payload,
  serverBaseUrl,
  signal,
}: ExtractMarkdownParams): Promise<ExtractMarkdownResponse> {
  const request = ExtractMarkdownRequestSchema.parse({
    ...payload,
    credentialMode: access.kind === 'byok' ? 'byok' : 'subscription',
  });
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };

  if (access.kind === 'byok') {
    headers['x-byok-api-key'] = access.apiKey.trim();
  } else {
    headers.authorization = `Bearer ${access.accessToken}`;
  }

  let response: Awaited<ReturnType<typeof requestJson<ExtractMarkdownResponse>>>;

  try {
    response = await requestJson<ExtractMarkdownResponse>({
      baseUrl: serverBaseUrl,
      data: request,
      headers,
      method: 'POST',
      pathname: '/api/v1/extractions',
      signal,
    });
  } catch (error) {
    if (isCanceledRequest(error, signal)) {
      throw new ExtractionApiError(
        getExtractionApiErrorMessage('REQUEST_TIMEOUT'),
        'REQUEST_TIMEOUT',
      );
    }

    throw new ExtractionApiError(
      getExtractionApiErrorMessage('NETWORK_ERROR'),
      'NETWORK_ERROR',
    );
  }

  const data = response.data;

  if (response.status < 200 || response.status >= 300) {
    const parsedError = ExtractionApiErrorResponseSchema.safeParse(data);

    if (!parsedError.success) {
      throw new ExtractionApiError(
        getExtractionApiErrorMessage('INVALID_RESPONSE'),
        'INVALID_RESPONSE',
        response.status,
      );
    }

    const code = parsedError.data.error.code;
    const message = isExtractionApiClientErrorCode(code)
      ? getExtractionApiErrorMessage(code)
      : parsedError.data.error.message;

    throw new ExtractionApiError(
      message,
      isExtractionApiClientErrorCode(code) ? code : 'INVALID_RESPONSE',
      response.status,
    );
  }

  const parsedResponse = ExtractMarkdownResponseSchema.safeParse(data);

  if (!parsedResponse.success) {
    throw new ExtractionApiError(
      getExtractionApiErrorMessage('INVALID_RESPONSE'),
      'INVALID_RESPONSE',
      response.status,
    );
  }

  return parsedResponse.data;
}
