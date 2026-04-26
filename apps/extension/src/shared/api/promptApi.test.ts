import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptApiError } from '@/shared/model/prompt';

import { optimizePrompt } from './promptApi';

describe('promptApi', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts the optimize request and returns parsed data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          optimizedPrompt: 'Refined prompt',
          metadata: {
            credentialMode: 'byok',
            model: 'gpt-4o-mini',
            outputStyle: 'structured',
            provider: 'openai-byok',
            targetAgent: 'codex',
          },
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    const result = await optimizePrompt({
      access: {
        apiKey: 'sk-test',
        kind: 'byok',
      },
      payload: {
        credentialMode: 'byok',
        outputStyle: 'structured',
        prompt: 'Fix my React app',
        targetAgent: 'codex',
      },
      serverBaseUrl: 'http://localhost:3000',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/prompt/optimize',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(result.optimizedPrompt).toBe('Refined prompt');
  });

  it('maps API errors to user-facing messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'OPENAI_AUTH_FAILED',
              message: 'Unauthorized',
            },
          }),
          {
            headers: {
              'content-type': 'application/json',
            },
            status: 401,
          },
        ),
      ),
    );

    await expect(
      optimizePrompt({
        access: {
          apiKey: 'sk-test',
          kind: 'byok',
        },
        payload: {
          credentialMode: 'byok',
          outputStyle: 'structured',
          prompt: 'Fix my React app',
          targetAgent: 'generic',
        },
        serverBaseUrl: 'http://localhost:3000',
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PromptApiError>>({
        code: 'OPENAI_AUTH_FAILED',
        message: 'Your OpenAI API key appears to be invalid.',
        status: 401,
      }),
    );
  });

  it('uses bearer auth and subscription mode for hosted optimization', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          optimizedPrompt: 'Hosted result',
          metadata: {
            credentialMode: 'subscription',
            model: 'deepseek-chat',
            outputStyle: 'structured',
            provider: 'deepseek-subscription',
            targetAgent: 'generic',
          },
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        },
      ),
    );

    vi.stubGlobal('fetch', fetchMock);

    await optimizePrompt({
      access: {
        accessToken: 'access-token',
        kind: 'subscription',
      },
      payload: {
        credentialMode: 'subscription',
        outputStyle: 'structured',
        prompt: 'Fix my React app',
        targetAgent: 'generic',
      },
      serverBaseUrl: 'http://localhost:3000',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/prompt/optimize',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer access-token',
        }),
      }),
    );
  });

  it('maps aborted requests to the timeout error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_input, init) => {
        const signal = init?.signal as AbortSignal | undefined;

        if (signal?.aborted) {
          throw new DOMException('The operation was aborted.', 'AbortError');
        }

        return await new Promise<Response>((_resolve, reject) => {
          signal?.addEventListener(
            'abort',
            () => {
              reject(
                new DOMException('The operation was aborted.', 'AbortError'),
              );
            },
            { once: true },
          );
        });
      }),
    );

    const controller = new AbortController();
    controller.abort();

    await expect(
      optimizePrompt({
        access: {
          apiKey: 'sk-test',
          kind: 'byok',
        },
        payload: {
          credentialMode: 'byok',
          outputStyle: 'structured',
          prompt: 'Fix my React app',
          targetAgent: 'generic',
        },
        serverBaseUrl: 'http://localhost:3000',
        signal: controller.signal,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PromptApiError>>({
        code: 'REQUEST_TIMEOUT',
        message: 'Optimization timed out after 30 seconds. Please try again.',
      }),
    );
  });
});
