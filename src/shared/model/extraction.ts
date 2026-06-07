import { z } from 'zod';

import { byokProviders } from './access';

export const extractionMimeTypes = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const extractionErrorCodes = [
  'AUTH_REQUIRED',
  'MISSING_BYOK_API_KEY',
  'UNSUPPORTED_PROVIDER',
  'INVALID_REQUEST',
  'SOURCE_TOO_LARGE',
  'BYOK_AUTH_FAILED',
  'BYOK_RATE_LIMITED',
  'BYOK_REQUEST_FAILED',
  'SUBSCRIPTION_REQUIRED',
  'SUBSCRIPTION_INACTIVE',
  'HOSTED_EXTRACTION_UNAVAILABLE',
  'INTERNAL_SERVER_ERROR',
] as const;

export type ExtractionMimeType = (typeof extractionMimeTypes)[number];
export type ExtractionErrorCode = (typeof extractionErrorCodes)[number];

export const MAX_EXTRACTION_SOURCE_BYTES = 10 * 1024 * 1024;

export const ExtractMarkdownRequestSchema = z
  .object({
    credentialMode: z.enum(['byok', 'subscription']).default('byok'),
    dataBase64: z.string().trim().min(1),
    filename: z.string().trim().min(1).optional(),
    mimeType: z.enum(extractionMimeTypes),
    model: z.string().trim().min(1).optional(),
    provider: z.enum(byokProviders).optional(),
    source: z
      .object({
        title: z.string().trim().min(1).optional(),
        type: z.enum(['visible_tab', 'upload']),
        url: z.string().trim().min(1).optional(),
      })
      .default({
        type: 'upload',
      }),
  })
  .superRefine((value, context) => {
    const approximateBytes = Math.floor((value.dataBase64.length * 3) / 4);

    if (approximateBytes > MAX_EXTRACTION_SOURCE_BYTES) {
      context.addIssue({
        code: 'custom',
        message: 'Source file is too large.',
        path: ['dataBase64'],
      });
    }

    if (value.credentialMode !== 'byok') {
      return;
    }

    if (value.provider !== 'openai') {
      context.addIssue({
        code: 'custom',
        message: 'Capture to Markdown supports OpenAI BYOK only.',
        path: ['provider'],
      });
    }

    if (!value.model) {
      context.addIssue({
        code: 'custom',
        message: 'Model is required for BYOK extraction.',
        path: ['model'],
      });
    }
  });

export const ExtractMarkdownResponseSchema = z.object({
  confidence: z.enum(['low', 'medium', 'high']),
  createdAt: z.string().datetime(),
  id: z.string().trim().min(1),
  markdown: z.string().trim().min(1),
  title: z.string().trim().min(1),
  warnings: z.array(z.string().trim()).default([]),
});

export const ExtractionApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.enum(extractionErrorCodes).catch('INTERNAL_SERVER_ERROR'),
    message: z.string().trim().min(1),
  }),
});

export type ExtractMarkdownRequest = z.input<
  typeof ExtractMarkdownRequestSchema
>;
export type ExtractMarkdownResponse = z.infer<
  typeof ExtractMarkdownResponseSchema
>;

export type ExtractionApiClientErrorCode =
  | ExtractionErrorCode
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'REQUEST_TIMEOUT';

export class ExtractionApiError extends Error {
  constructor(
    message: string,
    readonly code: ExtractionApiClientErrorCode,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'ExtractionApiError';
  }
}

export function getExtractionApiErrorMessage(
  code: ExtractionApiClientErrorCode,
): string {
  switch (code) {
    case 'AUTH_REQUIRED':
      return 'Please sign in to use shared hosted extraction.';
    case 'MISSING_BYOK_API_KEY':
      return 'An OpenAI API key is required for BYOK extraction.';
    case 'UNSUPPORTED_PROVIDER':
      return 'Capture to Markdown supports OpenAI only in this version.';
    case 'INVALID_REQUEST':
      return 'Please provide a supported image or PDF.';
    case 'SOURCE_TOO_LARGE':
      return 'The selected source is too large. Use an image or PDF under 10 MB.';
    case 'BYOK_AUTH_FAILED':
      return 'OpenAI rejected the provided API key.';
    case 'BYOK_RATE_LIMITED':
      return 'OpenAI rate limit was reached. Please wait and try again.';
    case 'BYOK_REQUEST_FAILED':
      return 'OpenAI could not extract Markdown from this source.';
    case 'SUBSCRIPTION_REQUIRED':
      return 'An active shared hosted access subscription is required.';
    case 'SUBSCRIPTION_INACTIVE':
      return 'Your shared hosted access subscription is inactive.';
    case 'HOSTED_EXTRACTION_UNAVAILABLE':
      return 'Shared hosted extraction is unavailable right now.';
    case 'INTERNAL_SERVER_ERROR':
      return 'Something went wrong. Please try again.';
    case 'NETWORK_ERROR':
      return 'Unable to reach the extraction service. Please try again.';
    case 'INVALID_RESPONSE':
      return 'The extraction service returned an unexpected response.';
    case 'REQUEST_TIMEOUT':
      return 'Extraction timed out. Please try a smaller source.';
  }
}

export function isExtractionApiClientErrorCode(
  code: string,
): code is ExtractionApiClientErrorCode {
  return (
    extractionErrorCodes.includes(code as ExtractionErrorCode) ||
    code === 'NETWORK_ERROR' ||
    code === 'INVALID_RESPONSE' ||
    code === 'REQUEST_TIMEOUT'
  );
}
