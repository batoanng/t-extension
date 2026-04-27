import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

import type { Config } from '../../types/config';
import { SubscriptionService } from '../subscription';
import { Service } from '../tokens';
import { PromptHttpException, getPromptErrorMessage } from './prompt.errors';
import type { PromptOptimizeRequest } from './prompt.schemas';

const minuteWindowMs = 60_000;
const dayWindowMs = 86_400_000;
const promptMinuteLimit = 10;
const promptDayLimit = 100;
const promptInvocationTimeoutMs = 30_000;
const fallbackRateLimitStore = new Map<string, number>();

const PROMPT_OPTIMIZER_SYSTEM_PROMPT = `
You are an expert prompt optimizer.

Your task is to rewrite the user's rough prompt into a clearer, more effective,
and better structured request for an AI assistant.

Rules:
- Preserve the user's original intent.
- Do not invent facts, technologies, file names, APIs, or requirements that the user did not provide.
- If important information is missing, make the improved prompt request clarification instead of guessing.
- Adapt the result to the requested purpose and output style.
- If response framing is disabled, return only the optimized prompt with no preamble or follow-up commentary.
- If response framing is enabled, you may include a brief framing line before the optimized prompt, but keep it minimal.
`.trim();

const byokProviderBaseUrls: Record<
  Exclude<PromptOptimizeRequest['provider'], undefined>,
  string | undefined
> = {
  claude: 'https://api.anthropic.com/v1/',
  deepseek: 'https://api.deepseek.com',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/',
  grok: 'https://api.x.ai/v1',
  openai: undefined,
};

export interface PromptModel {
  invoke(messages: Array<SystemMessage | HumanMessage>): Promise<{ content: unknown }>;
}

export type PromptModelFactory = (input: {
  apiKey: string;
  model: string;
  baseUrl?: string;
}) => PromptModel;

export const PROMPT_MODEL_FACTORY = Symbol('PROMPT_MODEL_FACTORY');

function getPurposeGuidance(purpose: PromptOptimizeRequest['purpose']) {
  switch (purpose) {
    case 'general':
      return 'Optimize for a broad-purpose assistant request that improves clarity, context, and expected outcome.';
    case 'design':
      return 'Optimize for a design-oriented request with intent, audience, style direction, and deliverables.';
    case 'technical-planning':
      return 'Optimize for planning technical implementation with constraints, open questions, and acceptance criteria.';
    case 'solution-architecture':
      return 'Optimize for architecture work with system boundaries, tradeoffs, interfaces, and non-functional requirements.';
    case 'test-strategy':
      return 'Optimize for creating a practical testing strategy with coverage goals, scenarios, and validation criteria.';
    case 'deployment-planning':
      return 'Optimize for deployment planning with rollout steps, dependencies, risks, and verification points.';
  }
}

function getOutputStyleGuidance(outputStyle: PromptOptimizeRequest['outputStyle']) {
  switch (outputStyle) {
    case 'concise':
      return 'Keep the rewritten prompt compact while retaining the important constraints and deliverables.';
    case 'detailed':
      return 'Include fuller structure, explicit context requests, and richer acceptance criteria without padding.';
    case 'structured':
      return 'Use a clear structure with labeled sections when the request benefits from them.';
  }
}

function getResponseFramingGuidance(includeResponseFraming: boolean) {
  if (includeResponseFraming) {
    return 'A brief framing line is allowed before the optimized prompt, but keep it short and professional.';
  }

  return 'Return only the optimized prompt body with no preamble, heading, explanation, or follow-up note.';
}

function buildUserPrompt(request: PromptOptimizeRequest): string {
  return [
    `Purpose: ${request.purpose}`,
    `Output style: ${request.outputStyle}`,
    `Include response framing: ${request.includeResponseFraming ? 'yes' : 'no'}`,
    getPurposeGuidance(request.purpose),
    getOutputStyleGuidance(request.outputStyle),
    getResponseFramingGuidance(request.includeResponseFraming),
    '',
    'Rewrite the following raw prompt for an AI assistant:',
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

async function invokePromptModelWithTimeout(
  model: PromptModel,
  messages: Array<SystemMessage | HumanMessage>,
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      model.invoke(messages),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(
            new PromptHttpException(
              HttpStatus.GATEWAY_TIMEOUT,
              'BYOK_REQUEST_FAILED',
              getPromptErrorMessage('BYOK_REQUEST_FAILED'),
            ),
          );
        }, promptInvocationTimeoutMs);
        timeoutId.unref?.();
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
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

  private async setRateLimitCount(cacheKey: string, value: number, ttlMs: number) {
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
    code: 'BYOK_RATE_LIMITED' | 'HOSTED_OPTIMIZATION_UNAVAILABLE',
  ) {
    const now = Date.now();
    const windowId = Math.floor(now / windowMs);
    const cacheKey = `prompt-rate:${scope}:${clientIdentifier}:${windowId}`;
    const currentCount = await this.getRateLimitCount(cacheKey);

    if (currentCount >= limit) {
      throw new PromptHttpException(429, code, getPromptErrorMessage(code));
    }

    const ttlMs = windowMs - (now % windowMs);
    await this.setRateLimitCount(cacheKey, currentCount + 1, ttlMs);
  }

  private async enforceRateLimit(input: {
    clientIdentifier: string;
    credentialMode: PromptOptimizeRequest['credentialMode'];
  }) {
    const code =
      input.credentialMode === 'subscription'
        ? 'HOSTED_OPTIMIZATION_UNAVAILABLE'
        : 'BYOK_RATE_LIMITED';

    await this.enforceWindowLimit(
      input.clientIdentifier,
      promptMinuteLimit,
      minuteWindowMs,
      'minute',
      code,
    );
    await this.enforceWindowLimit(
      input.clientIdentifier,
      promptDayLimit,
      dayWindowMs,
      'day',
      code,
    );
  }

  async optimizePrompt(
    input: PromptOptimizeRequest & {
      clientIp: string;
      apiKey?: string;
      userId?: string;
    },
  ) {
    const executionContext = await this.resolveExecutionContext(input);
    await this.enforceRateLimit({
      clientIdentifier: executionContext.rateLimitId,
      credentialMode: input.credentialMode,
    });

    const model = this.createPromptModel({
      apiKey: executionContext.apiKey,
      baseUrl: executionContext.baseUrl,
      model: executionContext.model,
    });

    let result: Awaited<ReturnType<typeof invokePromptModelWithTimeout>>;

    try {
      result = await invokePromptModelWithTimeout(model, [
        new SystemMessage(PROMPT_OPTIMIZER_SYSTEM_PROMPT),
        new HumanMessage(buildUserPrompt(input)),
      ]);
    } catch (error) {
      if (input.credentialMode === 'subscription') {
        throw new PromptHttpException(
          503,
          'HOSTED_OPTIMIZATION_UNAVAILABLE',
          getPromptErrorMessage('HOSTED_OPTIMIZATION_UNAVAILABLE'),
        );
      }

      throw error;
    }

    const optimizedPrompt = extractOptimizedPrompt(result.content);

    if (optimizedPrompt.length === 0) {
      throw new PromptHttpException(
        input.credentialMode === 'subscription' ? 503 : 502,
        input.credentialMode === 'subscription'
          ? 'HOSTED_OPTIMIZATION_UNAVAILABLE'
          : 'BYOK_REQUEST_FAILED',
        getPromptErrorMessage(
          input.credentialMode === 'subscription'
            ? 'HOSTED_OPTIMIZATION_UNAVAILABLE'
            : 'BYOK_REQUEST_FAILED',
        ),
      );
    }

    return {
      optimizedPrompt,
      metadata: {
        credentialMode: input.credentialMode,
        model: executionContext.model,
        provider: executionContext.metadataProvider,
        purpose: input.purpose,
        outputStyle: input.outputStyle,
        includeResponseFraming: input.includeResponseFraming,
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
          getPromptErrorMessage('HOSTED_OPTIMIZATION_UNAVAILABLE'),
        );
      }

      const access = await this.subscriptionService.assertHostedOptimizationAccess(input.userId);

      if (access.status === 'missing') {
        throw new PromptHttpException(
          403,
          'SUBSCRIPTION_REQUIRED',
          getPromptErrorMessage('SUBSCRIPTION_REQUIRED'),
        );
      }

      if (access.status === 'inactive') {
        throw new PromptHttpException(
          403,
          'SUBSCRIPTION_INACTIVE',
          getPromptErrorMessage('SUBSCRIPTION_INACTIVE'),
        );
      }

      return {
        apiKey: this.config.DEEPSEEK_API_KEY,
        baseUrl: this.config.DEEPSEEK_BASE_URL,
        metadataProvider: 'shared-hosted' as const,
        model: this.config.DEEPSEEK_MODEL,
        rateLimitId: `user:${input.userId}`,
      };
    }

    if (!input.apiKey) {
      throw new PromptHttpException(
        401,
        'MISSING_BYOK_API_KEY',
        getPromptErrorMessage('MISSING_BYOK_API_KEY'),
      );
    }

    if (!input.provider || !input.model) {
      throw new PromptHttpException(
        400,
        'INVALID_REQUEST',
        getPromptErrorMessage('INVALID_REQUEST'),
      );
    }

    return {
      apiKey: input.apiKey,
      baseUrl: byokProviderBaseUrls[input.provider],
      metadataProvider: input.provider,
      model: input.model,
      rateLimitId: `ip:${input.clientIp || 'unknown'}`,
    };
  }
}
