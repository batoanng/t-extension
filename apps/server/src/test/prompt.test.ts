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
        (() => ({
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
        model: 'gpt-4.1-mini',
        prompt: 'Fix this page',
        provider: 'openai',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.payload)).toEqual({
      error: {
        code: 'MISSING_BYOK_API_KEY',
        message: 'An API key is required for BYOK optimization.',
      },
    });
  });

  it('returns 400 when the prompt is too long', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/prompt/optimize',
      headers: {
        'x-byok-api-key': 'sk-test',
      },
      payload: {
        model: 'gpt-4.1-mini',
        prompt: 'a'.repeat(8001),
        provider: 'openai',
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
        'x-byok-api-key': 'sk-test',
      },
      payload: {
        includeResponseFraming: false,
        model: 'gpt-4.1-mini',
        outputStyle: 'structured',
        prompt: 'Fix my React page',
        provider: 'openai',
        purpose: 'technical-planning',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toEqual({
      metadata: {
        credentialMode: 'byok',
        includeResponseFraming: false,
        model: 'gpt-4.1-mini',
        outputStyle: 'structured',
        provider: 'openai',
        purpose: 'technical-planning',
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
        'x-byok-api-key': 'sk-test',
      },
      payload: {
        model: 'gpt-4.1-mini',
        prompt: 'Fix my React page',
        provider: 'openai',
      },
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.payload)).toEqual({
      error: {
        code: 'BYOK_AUTH_FAILED',
        message: 'The selected provider rejected the provided API key.',
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
        message: 'Please sign in to use shared hosted access.',
      },
    });
  });
});
