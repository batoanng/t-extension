import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptHttpException } from './prompt.errors';
import {
  PROMPT_MODEL_FACTORY,
  PromptService,
  type PromptModelFactory,
} from './prompt.service';

function createCacheManager() {
  const store = new Map<string, number>();

  return {
    async get<T>(key: string) {
      return (store.get(key) as T | undefined) ?? null;
    },
    async set(key: string, value: number) {
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

    const service = new PromptService(
      cacheManager as never,
      createPromptModel,
    );

    const result = await service.optimizePrompt({
      apiKey: 'sk-test',
      clientIp: '127.0.0.1',
      mode: 'developer-agent',
      outputStyle: 'structured',
      prompt: 'Fix my slow React page',
      targetAgent: 'codex',
    });

    expect(result).toEqual({
      metadata: {
        model: 'gpt-4o-mini',
        outputStyle: 'structured',
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

    const service = new PromptService(
      cacheManager as never,
      createPromptModel,
    );

    for (let requestCount = 0; requestCount < 10; requestCount += 1) {
      await service.optimizePrompt({
        apiKey: 'sk-test',
        clientIp: '192.168.0.1',
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
        mode: 'developer-agent',
        outputStyle: 'structured',
        prompt: 'One more prompt',
        targetAgent: 'generic',
      }),
    ).rejects.toBeInstanceOf(PromptHttpException);
  });
});
