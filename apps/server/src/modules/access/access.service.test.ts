import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { ServiceUnavailableException } from '@nestjs/common';
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

function readFixture(name: string) {
  return readFileSync(resolve(__dirname, '__fixtures__', name), 'utf8');
}

function createFixtureFetcher() {
  return vi.fn(async (url: string) => {
    if (url.includes('openai')) {
      return readFixture('openai.html');
    }

    if (url.includes('anthropic')) {
      return readFixture('claude.html');
    }

    if (url.includes('deepseek')) {
      return readFixture('deepseek.html');
    }

    if (url.includes('google')) {
      return readFixture('gemini.html');
    }

    if (url.includes('x.ai')) {
      return readFixture('grok.html');
    }

    throw new Error(`Unknown provider URL: ${url}`);
  });
}

describe('AccessCatalogService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds the catalog from provider fixtures', async () => {
    const service = new AccessCatalogService(
      createCacheManager() as never,
      accessTestConfig,
      createFixtureFetcher(),
    );

    const result = await service.getCatalog();

    expect(result.sharedHostedOffering).toEqual({
      enabled: true,
      label: 'Author Shared Key',
      plan: 'pro',
      priceAudMonthly: 2,
    });
    expect(result.cacheTtlSeconds).toBe(86_400);
    expect(result.providers.map((provider) => provider.id)).toEqual([
      'openai',
      'claude',
      'deepseek',
      'gemini',
      'grok',
    ]);
    expect(result.providers[0]).toMatchObject({
      defaultModelId: 'gpt-4.1-mini',
      id: 'openai',
      label: 'OpenAI',
    });
    expect(result.providers[1].models.map((model) => model.id)).toEqual([
      'claude-sonnet-4-20250514',
      'claude-haiku-3-20241022',
    ]);
    expect(result.providers[3].models.map((model) => model.id)).toEqual([
      'gemini-2.5-flash',
      'gemini-2.5-pro',
    ]);
    expect(result.providers[4].models.map((model) => model.id)).toEqual([
      'grok-4.20-reasoning',
      'grok-3',
    ]);
  });

  it('returns the last cached catalog when refresh fails after expiry', async () => {
    vi.useFakeTimers();

    try {
      const cacheManager = createCacheManager();
      const fetcher = createFixtureFetcher();
      const service = new AccessCatalogService(
        cacheManager as never,
        accessTestConfig,
        fetcher,
      );

      const initialCatalog = await service.getCatalog();

      vi.advanceTimersByTime(accessTestConfig.ACCESS_CATALOG_CACHE_TTL_SECONDS * 1000 + 1);
      fetcher.mockRejectedValueOnce(new Error('network down'));

      const fallbackCatalog = await service.getCatalog();

      expect(fallbackCatalog).toEqual(initialCatalog);
    } finally {
      vi.useRealTimers();
    }
  });

  it('throws a safe error when no cached catalog exists and refresh fails', async () => {
    const service = new AccessCatalogService(
      createCacheManager() as never,
      accessTestConfig,
      vi.fn().mockRejectedValue(new Error('network down')),
    );

    await expect(service.getCatalog()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
