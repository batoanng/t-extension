import { beforeEach, describe, expect, it, vi } from 'vitest';
import { optimizePrompt } from './promptApi';
import { PromptApiError } from '@/shared/model/prompt';

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
            model: 'gpt-4o-mini',
            outputStyle: 'structured',
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
      apiKey: 'sk-test',
      payload: {
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
        apiKey: 'sk-test',
        payload: {
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
});
