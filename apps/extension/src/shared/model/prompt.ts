import { z } from 'zod';

export const promptTargetAgents = [
  'generic',
  'codex',
  'claude-code',
  'cursor',
  'windsurf',
  'chatgpt',
] as const;

export const promptOutputStyles = [
  'structured',
  'concise',
  'detailed',
] as const;

export const promptErrorCodes = [
  'MISSING_OPENAI_API_KEY',
  'INVALID_REQUEST',
  'PROMPT_TOO_LONG',
  'OPENAI_AUTH_FAILED',
  'OPENAI_RATE_LIMITED',
  'OPENAI_REQUEST_FAILED',
  'INTERNAL_SERVER_ERROR',
] as const;

export const MIN_PROMPT_LENGTH = 3;
export const MAX_PROMPT_LENGTH = 8000;
export const DEFAULT_TARGET_AGENT = 'generic';
export const DEFAULT_OUTPUT_STYLE = 'structured';
export const DEFAULT_MODE = 'developer-agent';

export type PromptTargetAgent = (typeof promptTargetAgents)[number];
export type PromptOutputStyle = (typeof promptOutputStyles)[number];
export type PromptErrorCode = (typeof promptErrorCodes)[number];

export const OptimizePromptRequestSchema = z.object({
  prompt: z.string().trim().min(MIN_PROMPT_LENGTH).max(MAX_PROMPT_LENGTH),
  mode: z.literal(DEFAULT_MODE).default(DEFAULT_MODE),
  targetAgent: z.enum(promptTargetAgents).default(DEFAULT_TARGET_AGENT),
  outputStyle: z.enum(promptOutputStyles).default(DEFAULT_OUTPUT_STYLE),
});

export const OptimizePromptResponseSchema = z.object({
  optimizedPrompt: z.string().trim().min(1),
  metadata: z.object({
    model: z.string().trim().min(1),
    targetAgent: z.enum(promptTargetAgents),
    outputStyle: z.enum(promptOutputStyles),
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
  | 'INVALID_RESPONSE';

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
    case 'MISSING_OPENAI_API_KEY':
      return 'Please add your OpenAI API key first.';
    case 'INVALID_REQUEST':
      return 'Please enter a valid prompt.';
    case 'PROMPT_TOO_LONG':
      return 'Your prompt is too long. Please shorten it.';
    case 'OPENAI_AUTH_FAILED':
      return 'Your OpenAI API key appears to be invalid.';
    case 'OPENAI_RATE_LIMITED':
      return 'OpenAI rate limit reached. Please wait and try again.';
    case 'OPENAI_REQUEST_FAILED':
      return 'OpenAI could not process the request. Please try again.';
    case 'INTERNAL_SERVER_ERROR':
      return 'Something went wrong. Please try again.';
    case 'INVALID_RESPONSE':
      return 'Unable to optimize prompt. Please try again.';
    case 'NETWORK_ERROR':
      return 'Server is unavailable. Please try again later.';
  }
}

export function isPromptErrorCode(
  code: string,
): code is PromptErrorCode {
  return promptErrorCodes.includes(code as PromptErrorCode);
}

export const promptTargetAgentOptions: Array<{
  label: string;
  value: PromptTargetAgent;
}> = [
  { label: 'Generic', value: 'generic' },
  { label: 'Codex', value: 'codex' },
  { label: 'Claude Code', value: 'claude-code' },
  { label: 'Cursor', value: 'cursor' },
  { label: 'Windsurf', value: 'windsurf' },
  { label: 'ChatGPT', value: 'chatgpt' },
];

export const promptOutputStyleOptions: Array<{
  label: string;
  value: PromptOutputStyle;
}> = [
  { label: 'Structured', value: 'structured' },
  { label: 'Concise', value: 'concise' },
  { label: 'Detailed', value: 'detailed' },
];
