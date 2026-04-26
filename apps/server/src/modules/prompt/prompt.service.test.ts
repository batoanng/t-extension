import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Config } from '../../types/config';
import { PromptHttpException } from './prompt.errors';
import {
  PromptService,
  type PromptModelFactory,
} from './prompt.service';

const promptTestConfig: Config = Object.freeze({
  ACCESS_EXPIRES_IN: '15m',
  ACCESS_EXPIRES_IN_SECONDS: 900,
  ACCESS_SECRET: 'access-secret',
  API_PORT: 3000,
  API_VERSION: 1,
  CORS_ORIGIN: ['http://localhost:3001'],
  DATABASE_URL: 'mongodb://localhost:27017/nest',
  DEEPSEEK_API_KEY: 'deepseek-test',
  DEEPSEEK_BASE_URL: 'https://api.deepseek.com/v1',
  DEEPSEEK_MODEL: 'deepseek-chat',
  EMAIL_FROM: 'noreply@example.com',
  HEALTH_TOKEN: 'replace-me',
  OPENAI_API_KEY: undefined,
  OPENAI_MODEL: 'gpt-4o-mini',
  PROMPT_OPTIMIZER_PRO_PRICE_AUD_MONTHLY: 5,
  REDIS_HOST: 'localhost',
  REDIS_PASSWORD: undefined,
  REDIS_PORT: 6379,
  REDIS_USERNAME: undefined,
  REFRESH_EXPIRES_IN: '7d',
  REFRESH_EXPIRES_IN_SECONDS: 604800,
  REFRESH_SECRET: 'refresh-secret',
  RESEND_API_KEY: undefined,
  STRIPE_CANCEL_URL: 'https://example.com/cancel',
  STRIPE_PRO_MONTHLY_PRICE_ID: undefined,
  STRIPE_SECRET_KEY: undefined,
  STRIPE_SUCCESS_URL: 'https://example.com/success',
  STRIPE_WEBHOOK_SECRET: undefined,
  SWAGGER_ENABLE: false,
});

function createCacheManager() {
  const store = new Map<string, number>();

  return {
    get<T>(key: string) {
      return (store.get(key) as T | undefined) ?? null;
    },
    set(key: string, value: number) {
      store.set(key, value);
    },
  };
}

describe('PromptService', () => {
  beforeEach(() => {
    process.env.OPENAI_MODEL = 'gpt-4o-mini';
  });

  it('returns the optimized prompt and metadata', async () => {
    const cacheManager = createCacheManager();
    const createPromptModel: PromptModelFactory = vi.fn().mockReturnValue({
      invoke: vi.fn().mockResolvedValue({
        content: 'Structured optimized prompt',
      }),
    });
    const subscriptionService = {
      assertHostedOptimizationAccess: vi.fn(),
    };

    const service = new PromptService(
      cacheManager as never,
      createPromptModel,
      promptTestConfig,
      subscriptionService as never,
    );

    const result = await service.optimizePrompt({
      apiKey: 'sk-test',
      clientIp: '127.0.0.1',
      credentialMode: 'byok',
      mode: 'developer-agent',
      outputStyle: 'structured',
      prompt: 'Fix my slow React page',
      targetAgent: 'codex',
    });

    expect(result).toEqual({
      metadata: {
        credentialMode: 'byok',
        model: 'gpt-4o-mini',
        outputStyle: 'structured',
        provider: 'openai-byok',
        targetAgent: 'codex',
      },
      optimizedPrompt: 'Structured optimized prompt',
    });
  });

  it('enforces the prompt rate limit', async () => {
    const cacheManager = createCacheManager();
    const createPromptModel: PromptModelFactory = vi.fn().mockReturnValue({
      invoke: vi.fn().mockResolvedValue({
        content: 'Optimized prompt',
      }),
    });
    const subscriptionService = {
      assertHostedOptimizationAccess: vi.fn(),
    };

    const service = new PromptService(
      cacheManager as never,
      createPromptModel,
      promptTestConfig,
      subscriptionService as never,
    );

    for (let requestCount = 0; requestCount < 10; requestCount += 1) {
      await service.optimizePrompt({
        apiKey: 'sk-test',
        clientIp: '192.168.0.1',
        credentialMode: 'byok',
        mode: 'developer-agent',
        outputStyle: 'structured',
        prompt: `Prompt ${requestCount}`,
        targetAgent: 'generic',
      });
    }

    await expect(
      service.optimizePrompt({
        apiKey: 'sk-test',
        clientIp: '192.168.0.1',
        credentialMode: 'byok',
        mode: 'developer-agent',
        outputStyle: 'structured',
        prompt: 'One more prompt',
        targetAgent: 'generic',
      }),
    ).rejects.toBeInstanceOf(PromptHttpException);
  });
});
