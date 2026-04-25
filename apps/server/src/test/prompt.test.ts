import { CacheModule } from '@nestjs/cache-manager';
import { Test } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../modules/auth/auth.service';
import { SubscriptionService } from '../modules/subscription';
import { PromptFeatureModule } from '../modules/prompt';
import {
  PROMPT_MODEL_FACTORY,
  type PromptModelFactory,
} from '../modules/prompt/prompt.service';

describe('prompt routes', () => {
  let app: NestFastifyApplication;
  const invokeMock = vi.fn();
  const authenticateAccessToken = vi.fn();
  const assertHostedOptimizationAccess = vi.fn();

  beforeAll(async () => {
    process.env.OPENAI_MODEL = 'gpt-4o-mini';

    const moduleRef = await Test.createTestingModule({
      imports: [
        CacheModule.register({ isGlobal: true }),
        PromptFeatureModule,
      ],
    })
      .overrideProvider(PROMPT_MODEL_FACTORY)
      .useValue(
        ((_) => ({
          invoke: invokeMock,
        })) satisfies PromptModelFactory,
      )
      .overrideProvider(AuthService)
      .useValue({
        authenticateAccessToken,
      })
      .overrideProvider(SubscriptionService)
      .useValue({
        assertHostedOptimizationAccess,
      })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setGlobalPrefix('api/v1');

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    invokeMock.mockReset();
    authenticateAccessToken.mockReset();
    assertHostedOptimizationAccess.mockReset();
    assertHostedOptimizationAccess.mockResolvedValue({
      status: 'active',
    });
  });

  it('returns 401 when the API key header is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/prompt/optimize',
      payload: {
        prompt: 'Fix this page',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.payload)).toEqual({
      error: {
        code: 'MISSING_OPENAI_API_KEY',
        message: 'OpenAI API key is required.',
      },
    });
  });

  it('returns 400 when the prompt is too long', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/prompt/optimize',
      headers: {
        'x-openai-api-key': 'sk-test',
      },
      payload: {
        prompt: 'a'.repeat(8001),
      },
    });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.payload)).toEqual({
      error: {
        code: 'PROMPT_TOO_LONG',
        message: 'Prompt exceeds the maximum length of 8000 characters.',
      },
    });
  });

  it('returns the optimized prompt when the request is valid', async () => {
    invokeMock.mockResolvedValue({
      content: 'You are a senior React engineer...',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/prompt/optimize',
      headers: {
        'x-openai-api-key': 'sk-test',
      },
      payload: {
        outputStyle: 'structured',
        prompt: 'Fix my React page',
        targetAgent: 'codex',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({
      metadata: {
        credentialMode: 'byok',
        model: 'gpt-4o-mini',
        outputStyle: 'structured',
        provider: 'openai-byok',
        targetAgent: 'codex',
      },
      optimizedPrompt: 'You are a senior React engineer...',
    });
  });

  it('maps upstream auth failures to the public error contract', async () => {
    invokeMock.mockRejectedValue({
      status: 401,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/prompt/optimize',
      headers: {
        'x-openai-api-key': 'sk-test',
      },
      payload: {
        prompt: 'Fix my React page',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.payload)).toEqual({
      error: {
        code: 'OPENAI_AUTH_FAILED',
        message: 'OpenAI rejected the provided API key.',
      },
    });
  });

  it('returns 401 when subscription mode is requested without a bearer token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/prompt/optimize',
      payload: {
        credentialMode: 'subscription',
        prompt: 'Fix this page',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.payload)).toEqual({
      error: {
        code: 'AUTH_REQUIRED',
        message: 'Please sign in to use Developer Assistant Pro.',
      },
    });
  });
});
