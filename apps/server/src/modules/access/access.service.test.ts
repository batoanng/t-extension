import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Config } from '../../types/config';
import { AccessCatalogService } from './access.service';

const accessTestConfig: Config = Object.freeze({
  ACCESS_CATALOG_CACHE_TTL_SECONDS: 86_400,
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
  PROMPT_OPTIMIZER_PRO_PRICE_AUD_MONTHLY: 2,
  REDIS_HOST: 'localhost',
  REDIS_PASSWORD: undefined,
  REDIS_PORT: 6379,
  REDIS_TLS: false,
  REDIS_USERNAME: undefined,
  REFRESH_EXPIRES_IN: '7d',
  REFRESH_EXPIRES_IN_SECONDS: 604800,
  REFRESH_SECRET: 'refresh-secret',
  RESEND_API_KEY: undefined,
  STRIPE_CANCEL_URL: 'https://example.com/cancel',
  STRIPE_PRO_MONTHLY_PRICE_ID: 'price_pro_monthly',
  STRIPE_SECRET_KEY: 'stripe-secret',
  STRIPE_SUCCESS_URL: 'https://example.com/success',
  STRIPE_WEBHOOK_SECRET: undefined,
  SWAGGER_ENABLE: false,
});

function createCacheManager() {
  const store = new Map<string, unknown>();

  return {
    get<T>(key: string) {
      return (store.get(key) as T | undefined) ?? null;
    },
    set(key: string, value: unknown) {
      store.set(key, value);
    },
  };
}

describe('AccessCatalogService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds the catalog from hardcoded provider models', async () => {
    const service = new AccessCatalogService(createCacheManager() as never, accessTestConfig);

    const result = await service.getCatalog();

    expect(result.sharedHostedOffering).toEqual({
      enabled: true,
      label: 'Author Shared Key',
      plan: 'pro',
      priceAudMonthly: 2,
    });
    expect(result.cacheTtlSeconds).toBe(86_400);
    expect(result.generatedAt).toEqual(expect.any(String));
    expect(result.providers).toEqual([
      {
        defaultModelId: 'gpt-5.5',
        id: 'openai',
        label: 'OpenAI',
        models: [
          {
            id: 'gpt-5.5',
            label: 'GPT 5.5',
          },
          {
            id: 'gpt-5.4',
            label: 'GPT 5.4',
          },
          {
            id: 'gpt-5.4-mini',
            label: 'GPT 5.4 Mini',
          },
        ],
      },
      {
        defaultModelId: 'claude-opus-4.7',
        id: 'claude',
        label: 'Claude',
        models: [
          {
            id: 'claude-opus-4.7',
            label: 'Claude Opus 4.7',
          },
          {
            id: 'claude-sonnet-4.6',
            label: 'Claude Sonnet 4.6',
          },
          {
            id: 'claude-haiku-4.5',
            label: 'Claude Haiku 4.5',
          },
        ],
      },
      {
        defaultModelId: 'deepseek-v4-flash',
        id: 'deepseek',
        label: 'DeepSeek',
        models: [
          {
            id: 'deepseek-v4-flash',
            label: 'DeepSeek V4 Flash',
          },
          {
            id: 'deepseek-v4-pro',
            label: 'DeepSeek V4 Pro',
          },
        ],
      },
      {
        defaultModelId: 'gemini-2.5-pro',
        id: 'gemini',
        label: 'Gemini',
        models: [
          {
            id: 'gemini-2.5-pro',
            label: 'Gemini 2.5 Pro',
          },
          {
            id: 'gemini-3-flash',
            label: 'Gemini 3 Flash',
          },
          {
            id: 'gemini-3.1-pro',
            label: 'Gemini 3.1 Pro',
          },
        ],
      },
    ]);
    expect(result.providers.map((provider) => provider.id as string)).not.toContain('grok');
    expect(result.providers[0]).not.toHaveProperty('sourceUrl');
    expect(result.providers[0]).not.toHaveProperty('fetchedAt');
  });

  it('returns the cached catalog while the cache is fresh', async () => {
    vi.useFakeTimers();

    try {
      const cacheManager = createCacheManager();
      const service = new AccessCatalogService(cacheManager as never, accessTestConfig);

      vi.setSystemTime(new Date('2026-04-27T00:00:00.000Z'));
      const initialCatalog = await service.getCatalog();

      vi.setSystemTime(new Date('2026-04-27T00:30:00.000Z'));
      const cachedCatalog = await service.getCatalog();

      expect(cachedCatalog).toEqual(initialCatalog);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rebuilds the catalog after the cache expires', async () => {
    vi.useFakeTimers();

    try {
      const service = new AccessCatalogService(createCacheManager() as never, accessTestConfig);

      vi.setSystemTime(new Date('2026-04-27T00:00:00.000Z'));
      const initialCatalog = await service.getCatalog();

      vi.setSystemTime(new Date('2026-04-28T00:00:01.000Z'));
      const refreshedCatalog = await service.getCatalog();

      expect(refreshedCatalog.generatedAt).not.toBe(initialCatalog.generatedAt);
      expect(refreshedCatalog.providers).toEqual(initialCatalog.providers);
    } finally {
      vi.useRealTimers();
    }
  });
});
