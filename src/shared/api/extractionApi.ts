import type { GenerationAccess } from '@/shared/model/access';
import { env } from '@/shared/config';
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

import { generationAccessHeaders } from './accessHeaders';
import { isCanceledRequest, requestJson } from './httpClient';

export interface ExtractMarkdownParams {
  access: GenerationAccess;
  payload: ExtractMarkdownRequest;
  signal?: AbortSignal;
}

export async function extractMarkdown({
  access,
  payload,
  signal,
}: ExtractMarkdownParams): Promise<ExtractMarkdownResponse> {
  const request = ExtractMarkdownRequestSchema.parse({
    ...payload,
    credentialMode: access.kind === 'byok' ? 'byok' : 'subscription',
  });

  let response: Awaited<ReturnType<typeof requestJson<ExtractMarkdownResponse>>>;

  try {
    response = await requestJson<ExtractMarkdownResponse>({
      baseUrl: env.serverBaseUrl,
      data: request,
      headers: generationAccessHeaders(access),
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
