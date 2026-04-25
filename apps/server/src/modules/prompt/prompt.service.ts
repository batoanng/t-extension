import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

import type { Config } from '../../types/config';
import { Service } from '../tokens';
import { SubscriptionService } from '../subscription';
import { PromptHttpException } from './prompt.errors';
import type { PromptOptimizeRequest } from './prompt.schemas';

const minuteWindowMs = 60_000;
const dayWindowMs = 86_400_000;
const promptMinuteLimit = 10;
const promptDayLimit = 100;
const defaultModel = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
const fallbackRateLimitStore = new Map<string, number>();

const PROMPT_OPTIMIZER_SYSTEM_PROMPT = `
You are a senior software engineering prompt architect.

Your task is to rewrite the user's rough prompt into a clearer, more structured,
and more effective prompt for an AI coding agent.

Rules:
- Preserve the user's original intent.
- Do not invent facts, technologies, file names, APIs, or requirements that the user did not provide.
- If important information is missing, ask the coding agent to request clarification instead of guessing.
- Keep the result practical for engineering work.
- Prefer a structured prompt with explicit sections when the request benefits from it.
- Adapt the tone and structure to the requested target agent and output style.
- Return only the improved prompt.
`.trim();

export interface PromptModel {
  invoke(
    messages: Array<SystemMessage | HumanMessage>,
  ): Promise<{ content: unknown }>;
}

export type PromptModelFactory = (input: {
  apiKey: string;
  model: string;
  baseUrl?: string;
}) => PromptModel;

export const PROMPT_MODEL_FACTORY = Symbol('PROMPT_MODEL_FACTORY');

function getTargetAgentGuidance(targetAgent: PromptOptimizeRequest['targetAgent']) {
  switch (targetAgent) {
    case 'codex':
      return 'Optimize for a coding workflow that values concrete implementation steps, repo context requests, and verifiable outcomes.';
    case 'claude-code':
      return 'Optimize for an agent that can inspect a codebase, reason carefully, and explain tradeoffs before making changes.';
    case 'cursor':
      return 'Optimize for an editor-centric coding assistant that benefits from clear repo context, file references, and concise instructions.';
    case 'windsurf':
      return 'Optimize for an IDE coding assistant that works best with explicit tasks, constraints, and acceptance criteria.';
    case 'chatgpt':
      return 'Optimize for a general AI assistant that should still behave like a strong coding partner and ask for missing context when needed.';
    case 'generic':
      return 'Optimize for a general AI coding agent.';
  }
}

function getOutputStyleGuidance(
  outputStyle: PromptOptimizeRequest['outputStyle'],
) {
  switch (outputStyle) {
    case 'concise':
      return 'Keep the rewritten prompt compact while retaining the important constraints and deliverables.';
    case 'detailed':
      return 'Include fuller structure, explicit context requests, and richer acceptance criteria without padding.';
    case 'structured':
      return 'Use a structured layout with sections such as Role, Task, Context, Requirements, Constraints, Expected Output, and Acceptance Criteria when relevant.';
  }
}

function buildUserPrompt(request: PromptOptimizeRequest): string {
  return [
    `Target agent: ${request.targetAgent}`,
    `Output style: ${request.outputStyle}`,
    getTargetAgentGuidance(request.targetAgent),
    getOutputStyleGuidance(request.outputStyle),
    '',
    'Rewrite the following raw prompt for a developer-focused coding agent:',
    request.prompt,
  ].join('\n');
}

function extractOptimizedPrompt(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        if (part && typeof part === 'object') {
          const candidate = part as {
            text?: unknown;
          };

          if (typeof candidate.text === 'string') {
            return candidate.text;
          }
        }

        return '';
      })
      .join('\n')
      .trim();
  }

  return '';
}

@Injectable()
export class PromptService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(PROMPT_MODEL_FACTORY)
    private readonly createPromptModel: PromptModelFactory,
    @Inject(Service.CONFIG) private readonly config: Config,
    @Inject(SubscriptionService)
    private readonly subscriptionService: SubscriptionService,
  ) {}

  private async getRateLimitCount(cacheKey: string) {
    try {
      return Number((await this.cacheManager.get<number>(cacheKey)) ?? 0);
    } catch {
      return fallbackRateLimitStore.get(cacheKey) ?? 0;
    }
  }

  private async setRateLimitCount(
    cacheKey: string,
    value: number,
    ttlMs: number,
  ) {
    try {
      await this.cacheManager.set(cacheKey, value, ttlMs);
      return;
    } catch {
      fallbackRateLimitStore.set(cacheKey, value);

      const cleanupTimer = setTimeout(() => {
        fallbackRateLimitStore.delete(cacheKey);
      }, ttlMs);

      cleanupTimer.unref?.();
    }
  }

  private async enforceWindowLimit(
    clientIdentifier: string,
    limit: number,
    windowMs: number,
    scope: 'minute' | 'day',
  ) {
    const now = Date.now();
    const windowId = Math.floor(now / windowMs);
    const cacheKey = `prompt-rate:${scope}:${clientIdentifier}:${windowId}`;
    const currentCount = await this.getRateLimitCount(cacheKey);

    if (currentCount >= limit) {
      throw new PromptHttpException(
        429,
        'OPENAI_RATE_LIMITED',
        'OpenAI rate limit reached. Please wait and try again.',
      );
    }

    const ttlMs = windowMs - (now % windowMs);
    await this.setRateLimitCount(cacheKey, currentCount + 1, ttlMs);
  }

  private async enforceRateLimit(clientIdentifier: string) {
    await this.enforceWindowLimit(
      clientIdentifier,
      promptMinuteLimit,
      minuteWindowMs,
      'minute',
    );
    await this.enforceWindowLimit(
      clientIdentifier,
      promptDayLimit,
      dayWindowMs,
      'day',
    );
  }

  async optimizePrompt(input: PromptOptimizeRequest & {
    clientIp: string;
    apiKey?: string;
    userId?: string;
  }) {
    const executionContext = await this.resolveExecutionContext(input);
    await this.enforceRateLimit(executionContext.rateLimitId);

    const model = this.createPromptModel({
      apiKey: executionContext.apiKey,
      baseUrl: executionContext.baseUrl,
      model: executionContext.model,
    });

    const result = await model.invoke([
      new SystemMessage(PROMPT_OPTIMIZER_SYSTEM_PROMPT),
      new HumanMessage(buildUserPrompt(input)),
    ]);
    const optimizedPrompt = extractOptimizedPrompt(result.content);

    if (optimizedPrompt.length === 0) {
      throw new PromptHttpException(
        502,
        'OPENAI_REQUEST_FAILED',
        'OpenAI could not process the request. Please try again.',
      );
    }

    return {
      optimizedPrompt,
      metadata: {
        credentialMode: input.credentialMode,
        model: executionContext.model,
        provider: executionContext.provider,
        targetAgent: input.targetAgent,
        outputStyle: input.outputStyle,
      },
    };
  }

  private async resolveExecutionContext(
    input: PromptOptimizeRequest & {
      clientIp: string;
      apiKey?: string;
      userId?: string;
    },
  ) {
    if (input.credentialMode === 'subscription') {
      if (!input.userId) {
        throw new PromptHttpException(401, 'AUTH_REQUIRED', 'Unauthorized');
      }

      if (!this.config.DEEPSEEK_API_KEY) {
        throw new PromptHttpException(
          503,
          'HOSTED_OPTIMIZATION_UNAVAILABLE',
          'Hosted optimization is unavailable right now.',
        );
      }

      const access = await this.subscriptionService.assertHostedOptimizationAccess(
        input.userId,
      );

      if (access.status === 'missing') {
        throw new PromptHttpException(
          403,
          'SUBSCRIPTION_REQUIRED',
          'An active Developer Assistant Pro subscription is required.',
        );
      }

      if (access.status === 'inactive') {
        throw new PromptHttpException(
          403,
          'SUBSCRIPTION_INACTIVE',
          'Your Developer Assistant Pro subscription is inactive.',
        );
      }

      return {
        apiKey: this.config.DEEPSEEK_API_KEY,
        baseUrl: this.config.DEEPSEEK_BASE_URL,
        model: this.config.DEEPSEEK_MODEL,
        provider: 'deepseek-subscription' as const,
        rateLimitId: `user:${input.userId}`,
      };
    }

    if (!input.apiKey) {
      throw new PromptHttpException(
        401,
        'MISSING_OPENAI_API_KEY',
        'OpenAI API key is required.',
      );
    }

    return {
      apiKey: input.apiKey,
      baseUrl: undefined,
      model: defaultModel,
      provider: 'openai-byok' as const,
      rateLimitId: `ip:${input.clientIp || 'unknown'}`,
    };
  }
}
