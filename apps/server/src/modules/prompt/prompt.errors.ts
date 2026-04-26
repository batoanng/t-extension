import { HttpException, HttpStatus } from '@nestjs/common';
import { z } from 'zod';

export const promptErrorCodes = [
  'AUTH_REQUIRED',
  'MISSING_OPENAI_API_KEY',
  'INVALID_REQUEST',
  'PROMPT_TOO_LONG',
  'OPENAI_AUTH_FAILED',
  'OPENAI_RATE_LIMITED',
  'OPENAI_REQUEST_FAILED',
  'SUBSCRIPTION_REQUIRED',
  'SUBSCRIPTION_INACTIVE',
  'HOSTED_OPTIMIZATION_UNAVAILABLE',
  'INTERNAL_SERVER_ERROR',
] as const;

export type PromptErrorCode = (typeof promptErrorCodes)[number];

interface PromptErrorBody {
  error: {
    code: PromptErrorCode;
    message: string;
  };
}

export class PromptHttpException extends HttpException {
  readonly code: PromptErrorCode;

  constructor(status: number, code: PromptErrorCode, message: string) {
    super(
      {
        error: {
          code,
          message,
        },
      } satisfies PromptErrorBody,
      status,
    );
    this.code = code;
  }
}

function getErrorStatus(error: unknown): number | null {
  if (error && typeof error === 'object') {
    const candidate = error as {
      response?: {
        status?: number;
      };
      status?: number;
      statusCode?: number;
    };

    if (typeof candidate.status === 'number') {
      return candidate.status;
    }

    if (typeof candidate.statusCode === 'number') {
      return candidate.statusCode;
    }

    if (typeof candidate.response?.status === 'number') {
      return candidate.response.status;
    }
  }

  return null;
}

export function getPromptErrorMessage(code: PromptErrorCode): string {
  switch (code) {
    case 'AUTH_REQUIRED':
      return 'Please sign in to use Developer Assistant Pro.';
    case 'MISSING_OPENAI_API_KEY':
      return 'OpenAI API key is required.';
    case 'INVALID_REQUEST':
      return 'Please enter a valid prompt.';
    case 'PROMPT_TOO_LONG':
      return 'Prompt exceeds the maximum length of 8000 characters.';
    case 'OPENAI_AUTH_FAILED':
      return 'OpenAI rejected the provided API key.';
    case 'OPENAI_RATE_LIMITED':
      return 'OpenAI rate limit reached. Please wait and try again.';
    case 'OPENAI_REQUEST_FAILED':
      return 'OpenAI could not process the request. Please try again.';
    case 'SUBSCRIPTION_REQUIRED':
      return 'An active Developer Assistant Pro subscription is required.';
    case 'SUBSCRIPTION_INACTIVE':
      return 'Your Developer Assistant Pro subscription is inactive.';
    case 'HOSTED_OPTIMIZATION_UNAVAILABLE':
      return 'Hosted optimization is unavailable right now.';
    case 'INTERNAL_SERVER_ERROR':
      return 'Something went wrong. Please try again.';
  }
}

export function fromPromptValidationError(error: z.ZodError) {
  const hasPromptTooLongIssue = error.issues.some(
    (issue) =>
      issue.path[0] === 'prompt' &&
      issue.code === 'too_big' &&
      typeof issue.maximum === 'number' &&
      issue.maximum >= 8000,
  );

  if (hasPromptTooLongIssue) {
    return new PromptHttpException(
      HttpStatus.BAD_REQUEST,
      'PROMPT_TOO_LONG',
      getPromptErrorMessage('PROMPT_TOO_LONG'),
    );
  }

  return new PromptHttpException(
    HttpStatus.BAD_REQUEST,
    'INVALID_REQUEST',
    getPromptErrorMessage('INVALID_REQUEST'),
  );
}

export function toPromptHttpException(error: unknown): PromptHttpException {
  if (error instanceof PromptHttpException) {
    return error;
  }

  if (error instanceof z.ZodError) {
    return fromPromptValidationError(error);
  }

  const status = getErrorStatus(error);

  if (status === 401) {
    return new PromptHttpException(
      HttpStatus.UNAUTHORIZED,
      'OPENAI_AUTH_FAILED',
      getPromptErrorMessage('OPENAI_AUTH_FAILED'),
    );
  }

  if (status === 429) {
    return new PromptHttpException(
      HttpStatus.TOO_MANY_REQUESTS,
      'OPENAI_RATE_LIMITED',
      getPromptErrorMessage('OPENAI_RATE_LIMITED'),
    );
  }

  if (typeof status === 'number' && status >= 400) {
    return new PromptHttpException(
      HttpStatus.BAD_GATEWAY,
      'OPENAI_REQUEST_FAILED',
      getPromptErrorMessage('OPENAI_REQUEST_FAILED'),
    );
  }

  return new PromptHttpException(
    HttpStatus.INTERNAL_SERVER_ERROR,
    'INTERNAL_SERVER_ERROR',
    getPromptErrorMessage('INTERNAL_SERVER_ERROR'),
  );
}
