import { z } from 'zod';

import { byokProviders } from './access';

export const promptPurposes = [
  'general',
  'design',
  'technical-planning',
  'solution-architecture',
  'test-strategy',
  'deployment-planning',
] as const;

export const promptOutputStyles = [
  'structured',
  'concise',
  'detailed',
] as const;

export const promptMetadataProviders = [
  ...byokProviders,
  'shared-hosted',
] as const;

export const promptErrorCodes = [
  'AUTH_REQUIRED',
  'MISSING_BYOK_API_KEY',
  'INVALID_REQUEST',
  'PROMPT_TOO_LONG',
  'BYOK_AUTH_FAILED',
  'BYOK_RATE_LIMITED',
  'BYOK_REQUEST_FAILED',
  'SUBSCRIPTION_REQUIRED',
  'SUBSCRIPTION_INACTIVE',
  'HOSTED_OPTIMIZATION_UNAVAILABLE',
  'INTERNAL_SERVER_ERROR',
] as const;

export const MIN_PROMPT_LENGTH = 3;
export const MAX_PROMPT_LENGTH = 8000;
export const DEFAULT_PROMPT_PURPOSE = 'general';
export const DEFAULT_OUTPUT_STYLE = 'structured';
export const DEFAULT_MODE = 'developer-agent';

export type PromptPurpose = (typeof promptPurposes)[number];
export type PromptOutputStyle = (typeof promptOutputStyles)[number];
export type PromptMetadataProvider = (typeof promptMetadataProviders)[number];
export type PromptErrorCode = (typeof promptErrorCodes)[number];

export const OptimizePromptRequestSchema = z
  .object({
    prompt: z.string().trim().min(MIN_PROMPT_LENGTH).max(MAX_PROMPT_LENGTH),
    mode: z.literal(DEFAULT_MODE).default(DEFAULT_MODE),
    credentialMode: z.enum(['byok', 'subscription']).default('byok'),
    provider: z.enum(byokProviders).optional(),
    model: z.string().trim().min(1).optional(),
    purpose: z.enum(promptPurposes).default(DEFAULT_PROMPT_PURPOSE),
    outputStyle: z.enum(promptOutputStyles).default(DEFAULT_OUTPUT_STYLE),
    includeResponseFraming: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (value.credentialMode !== 'byok') {
      return;
    }

    if (!value.provider) {
      context.addIssue({
        code: 'custom',
        message: 'Provider is required for BYOK requests.',
        path: ['provider'],
      });
    }

    if (!value.model) {
      context.addIssue({
        code: 'custom',
        message: 'Model is required for BYOK requests.',
        path: ['model'],
      });
    }
  });

export const OptimizePromptResponseSchema = z.object({
  optimizedPrompt: z.string().trim().min(1),
  metadata: z.object({
    credentialMode: z.enum(['byok', 'subscription']),
    model: z.string().trim().min(1),
    provider: z.enum(promptMetadataProviders),
    purpose: z.enum(promptPurposes),
    outputStyle: z.enum(promptOutputStyles),
    includeResponseFraming: z.boolean(),
  }),
});

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.enum(promptErrorCodes).catch('INTERNAL_SERVER_ERROR'),
    message: z.string().trim().min(1),
  }),
});

export type OptimizePromptRequest = z.input<typeof OptimizePromptRequestSchema>;
export type OptimizePromptResponse = z.infer<
  typeof OptimizePromptResponseSchema
>;

export type PromptApiClientErrorCode =
  | PromptErrorCode
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'REQUEST_TIMEOUT';

export class PromptApiError extends Error {
  constructor(
    message: string,
    readonly code: PromptApiClientErrorCode,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'PromptApiError';
  }
}

export function getPromptValidationMessage(prompt: string): string | null {
  const trimmedPrompt = prompt.trim();

  if (trimmedPrompt.length === 0) {
    return 'Please enter a prompt first.';
  }

  if (trimmedPrompt.length < MIN_PROMPT_LENGTH) {
    return `Please enter at least ${MIN_PROMPT_LENGTH} characters.`;
  }

  if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
    return 'Your prompt is too long. Please shorten it.';
  }

  return null;
}

export function getPromptApiErrorMessage(
  code: PromptApiClientErrorCode,
): string {
  switch (code) {
    case 'AUTH_REQUIRED':
      return 'Please sign in to use shared hosted access.';
    case 'MISSING_BYOK_API_KEY':
      return 'Please add your API key first.';
    case 'INVALID_REQUEST':
      return 'Please enter a valid prompt.';
    case 'PROMPT_TOO_LONG':
      return 'Your prompt is too long. Please shorten it.';
    case 'BYOK_AUTH_FAILED':
      return 'The selected provider rejected the provided API key.';
    case 'BYOK_RATE_LIMITED':
      return 'The selected provider rate limit was reached. Please wait and try again.';
    case 'BYOK_REQUEST_FAILED':
      return 'The selected provider could not process the request. Please try again.';
    case 'SUBSCRIPTION_REQUIRED':
      return 'Subscribe for shared hosted access to use hosted optimization.';
    case 'SUBSCRIPTION_INACTIVE':
      return 'Your shared hosted access subscription is inactive.';
    case 'HOSTED_OPTIMIZATION_UNAVAILABLE':
      return 'Shared hosted optimization is unavailable right now.';
    case 'INTERNAL_SERVER_ERROR':
      return 'Something went wrong. Please try again.';
    case 'INVALID_RESPONSE':
      return 'Unable to optimize prompt. Please try again.';
    case 'NETWORK_ERROR':
      return 'Server is unavailable. Please try again later.';
    case 'REQUEST_TIMEOUT':
      return 'Optimization timed out after 30 seconds. Please try again.';
  }
}

export function isPromptErrorCode(code: string): code is PromptErrorCode {
  return promptErrorCodes.includes(code as PromptErrorCode);
}

export const promptPurposeOptions: Array<{
  label: string;
  value: PromptPurpose;
}> = [
  { label: 'General Guidance', value: 'general' },
  { label: 'Design Brief', value: 'design' },
  { label: 'Technical Planning', value: 'technical-planning' },
  { label: 'Solution Architecture', value: 'solution-architecture' },
  { label: 'Test Strategy', value: 'test-strategy' },
  { label: 'Deployment Planning', value: 'deployment-planning' },
];

export const promptOutputStyleOptions: Array<{
  label: string;
  value: PromptOutputStyle;
}> = [
  { label: 'Structured', value: 'structured' },
  { label: 'Concise', value: 'concise' },
  { label: 'Detailed', value: 'detailed' },
];

export function getPromptMetadataProviderLabel(
  provider: PromptMetadataProvider,
): string {
  switch (provider) {
    case 'openai':
      return 'OpenAI';
    case 'claude':
      return 'Claude';
    case 'deepseek':
      return 'DeepSeek';
    case 'gemini':
      return 'Gemini';
    case 'shared-hosted':
      return 'Shared Hosted';
  }
}
