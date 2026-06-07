import { z } from 'zod';

import { generationMetadataProviders } from './contextPack';

export const visualizationDiagramTypes = ['graph', 'mindmap'] as const;

export const visualizationErrorCodes = [
  'AUTH_REQUIRED',
  'MISSING_BYOK_API_KEY',
  'INVALID_REQUEST',
  'CONTEXT_TOO_LONG',
  'BYOK_AUTH_FAILED',
  'BYOK_RATE_LIMITED',
  'BYOK_REQUEST_FAILED',
  'SUBSCRIPTION_REQUIRED',
  'SUBSCRIPTION_INACTIVE',
  'HOSTED_GENERATION_UNAVAILABLE',
  'INTERNAL_SERVER_ERROR',
] as const;

export type VisualizationDiagramType =
  (typeof visualizationDiagramTypes)[number];
export type VisualizationErrorCode = (typeof visualizationErrorCodes)[number];
export type VisualizationMetadataProvider =
  (typeof generationMetadataProviders)[number];

export const VisualizationItemSchema = z.object({
  id: z.string().trim().min(1),
  kind: z.enum(['capture', 'generation']),
  markdown: z.string().trim().min(1),
  sourceTitle: z.string().trim().min(1),
  title: z.string().trim().min(1),
});

export const CreateVisualizationRequestSchema = z.object({
  credentialMode: z.enum(['byok', 'subscription']).default('byok'),
  diagramType: z.enum(visualizationDiagramTypes),
  items: z.array(VisualizationItemSchema).min(1).max(5),
});

export const CreateVisualizationResponseSchema = z.object({
  createdAt: z.string().datetime(),
  diagramType: z.enum(visualizationDiagramTypes),
  id: z.string().trim().min(1),
  mermaid: z.string().trim().min(1),
  title: z.string().trim().min(1),
  warnings: z.array(z.string().trim()).default([]),
});

export const VisualizationApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.enum(visualizationErrorCodes).catch('INTERNAL_SERVER_ERROR'),
    message: z.string().trim().min(1),
  }),
});

export type VisualizationItem = z.infer<typeof VisualizationItemSchema>;
export type CreateVisualizationRequest = z.input<
  typeof CreateVisualizationRequestSchema
>;
export type CreateVisualizationResponse = z.infer<
  typeof CreateVisualizationResponseSchema
>;

export type VisualizationApiClientErrorCode =
  | VisualizationErrorCode
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'REQUEST_TIMEOUT';

export class VisualizationApiError extends Error {
  constructor(
    message: string,
    readonly code: VisualizationApiClientErrorCode,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'VisualizationApiError';
  }
}

export function getVisualizationApiErrorMessage(
  code: VisualizationApiClientErrorCode,
): string {
  switch (code) {
    case 'AUTH_REQUIRED':
      return 'Please sign in to use shared hosted visualization.';
    case 'MISSING_BYOK_API_KEY':
      return 'An OpenRouter API key is required for BYOK visualization.';
    case 'INVALID_REQUEST':
      return 'Select at least one saved Markdown output.';
    case 'CONTEXT_TOO_LONG':
      return 'The selected Markdown is too long. Select fewer outputs.';
    case 'BYOK_AUTH_FAILED':
      return 'OpenRouter rejected the provided API key.';
    case 'BYOK_RATE_LIMITED':
      return 'OpenRouter rate limit was reached. Please wait and try again.';
    case 'BYOK_REQUEST_FAILED':
      return 'OpenRouter could not create the visualization.';
    case 'SUBSCRIPTION_REQUIRED':
      return 'An active shared hosted access subscription is required.';
    case 'SUBSCRIPTION_INACTIVE':
      return 'Your shared hosted access subscription is inactive.';
    case 'HOSTED_GENERATION_UNAVAILABLE':
      return 'Shared hosted visualization is unavailable right now.';
    case 'INTERNAL_SERVER_ERROR':
      return 'Something went wrong. Please try again.';
    case 'NETWORK_ERROR':
      return 'Unable to reach the visualization service. Please try again.';
    case 'INVALID_RESPONSE':
      return 'The visualization service returned an unexpected response.';
    case 'REQUEST_TIMEOUT':
      return 'Visualization timed out. Select fewer outputs and try again.';
  }
}

export function isVisualizationApiClientErrorCode(
  code: string,
): code is VisualizationApiClientErrorCode {
  return (
    visualizationErrorCodes.includes(code as VisualizationErrorCode) ||
    code === 'NETWORK_ERROR' ||
    code === 'INVALID_RESPONSE' ||
    code === 'REQUEST_TIMEOUT'
  );
}
