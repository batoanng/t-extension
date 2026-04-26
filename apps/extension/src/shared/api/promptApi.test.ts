import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptApiError } from '@/shared/model/prompt';

import { optimizePrompt } from './promptApi';

vi.mock('axios', () => ({
  default: {
    isAxiosError: (error: unknown) =>
      Boolean((error as { isAxiosError?: boolean } | null)?.isAxiosError),
    request: vi.fn(),
  },
}));

function createAxiosResponse<T>(data: T, status = 200) {
  return {
    data,
    status,
  };
}

describe('promptApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts the optimize request and returns parsed data', async () => {
    const requestMock = vi.mocked(axios.request);
    requestMock.mockResolvedValue(
      createAxiosResponse({
        optimizedPrompt: 'Refined prompt',
        metadata: {
          credentialMode: 'byok',
          model: 'gpt-4o-mini',
          outputStyle: 'structured',
          provider: 'openai-byok',
          targetAgent: 'codex',
        },
      }),
    );

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

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'http://localhost:3000/api/v1/prompt/optimize',
      }),
    );
    expect(result.optimizedPrompt).toBe('Refined prompt');
  });

  it('maps API errors to user-facing messages', async () => {
    vi.mocked(axios.request).mockResolvedValue(
      createAxiosResponse(
        {
          error: {
            code: 'OPENAI_AUTH_FAILED',
            message: 'Unauthorized',
          },
        },
        401,
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
    const requestMock = vi.mocked(axios.request);
    requestMock.mockResolvedValue(
      createAxiosResponse({
        optimizedPrompt: 'Hosted result',
        metadata: {
          credentialMode: 'subscription',
          model: 'deepseek-chat',
          outputStyle: 'structured',
          provider: 'deepseek-subscription',
          targetAgent: 'generic',
        },
      }),
    );

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

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer access-token',
        }),
        url: 'http://localhost:3000/api/v1/prompt/optimize',
      }),
    );
  });

  it('maps aborted requests to the timeout error message', async () => {
    vi.mocked(axios.request).mockRejectedValue({
      code: 'ERR_CANCELED',
      isAxiosError: true,
    });

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
