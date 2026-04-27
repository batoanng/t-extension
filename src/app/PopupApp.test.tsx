import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetAccessStoreForTests } from '@/features/access/model/useAccessStore';
import { __resetSavedApiKeyStoreForTests } from '@/features/api-key/model/useSavedApiKey';

import { PopupApp } from './PopupApp';

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

function createAccessCatalogResponse() {
  return createAxiosResponse({
    cacheTtlSeconds: 86_400,
    generatedAt: '2026-04-27T00:00:00.000Z',
    providers: [
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
    ],
    sharedHostedOffering: {
      enabled: true,
      label: 'Author Shared Key',
      plan: 'pro',
      priceAudMonthly: 2,
    },
  });
}

describe('PopupApp', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetSavedApiKeyStoreForTests();
    __resetAccessStoreForTests();
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.mocked(axios.request).mockResolvedValue(createAccessCatalogResponse());
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('shows the compact header tooltip on focus', async () => {
    render(<PopupApp />);

    expect(
      screen.queryByText(
        'Rewrite rough prompts into clearer instructions for the AI assistant you plan to use.',
      ),
    ).not.toBeInTheDocument();

    fireEvent.focus(
      screen.getByRole('button', { name: 'About Prompt Optimizer' }),
    );

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Rewrite rough prompts into clearer instructions for the AI assistant you plan to use.',
      ),
    ).toBeInTheDocument();
  });

  it('starts with the access panel expanded when no API key exists', async () => {
    render(<PopupApp />);

    await waitFor(() => {
      expect(screen.getByLabelText('API key')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: 'Collapse optimization access' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Optimize Prompt' }),
    ).toBeDisabled();
  });

  it('auto-collapses after saving an API key', async () => {
    render(<PopupApp />);

    fireEvent.change(await screen.findByLabelText('API key'), {
      target: {
        value: 'sk-test-key',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('API key')).not.toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: 'Expand optimization access' }),
    ).toBeInTheDocument();
  });

  it('remembers a manual collapse across remounts and shows the missing-key badge', async () => {
    const firstRender = render(<PopupApp />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Collapse optimization access',
      }),
    );

    await waitFor(() => {
      expect(screen.queryByLabelText('API key')).not.toBeInTheDocument();
    });

    expect(
      screen.getByLabelText('Optimization access needs attention'),
    ).toBeInTheDocument();

    firstRender.unmount();

    render(<PopupApp />);

    expect(
      screen.getByRole('button', { name: 'Expand optimization access' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('API key')).not.toBeInTheDocument();
  });

  it('keeps the access panel open in shared hosted mode and shows the blocked-access badge when sign-in is required', async () => {
    render(<PopupApp />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Use Author Shared Key' }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Collapse optimization access' }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByLabelText('Optimization access needs attention'),
    ).toBeInTheDocument();
  });

  it('saves an API key and optimizes a prompt', async () => {
    const requestMock = vi.mocked(axios.request);
    requestMock
      .mockResolvedValueOnce(createAccessCatalogResponse())
      .mockResolvedValueOnce(
        createAxiosResponse({
          optimizedPrompt: 'Structured result',
          metadata: {
            credentialMode: 'byok',
            includeResponseFraming: false,
            model: 'gpt-5.5',
            outputStyle: 'structured',
            provider: 'openai',
            purpose: 'general',
          },
        }),
      );

    render(<PopupApp />);

    fireEvent.change(await screen.findByLabelText('API key'), {
      target: {
        value: 'sk-test-key',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('API key')).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Raw prompt'), {
      target: {
        value: 'Fix my slow React page',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Optimize Prompt' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Structured result')).toBeInTheDocument();
    });

    expect(requestMock).toHaveBeenCalledTimes(2);
  });

  it('re-enables optimization and badges the access panel when the saved API key is rejected', async () => {
    const requestMock = vi.mocked(axios.request);
    requestMock
      .mockResolvedValueOnce(createAccessCatalogResponse())
      .mockResolvedValueOnce(
        createAxiosResponse(
          {
            error: {
              code: 'BYOK_AUTH_FAILED',
              message: 'Unauthorized',
            },
          },
          401,
        ),
      );

    render(<PopupApp />);

    fireEvent.change(await screen.findByLabelText('API key'), {
      target: {
        value: 'sk-invalid',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('API key')).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Raw prompt'), {
      target: {
        value: 'Fix my slow React page',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Optimize Prompt' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'The selected provider rejected the provided API key.',
        ),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: 'Optimize Prompt' }),
    ).toBeEnabled();
    expect(
      screen.getByLabelText('Optimization access needs attention'),
    ).toBeInTheDocument();
  });

  it('times out a stalled optimize request and restores the button state', async () => {
    vi.useFakeTimers();
    const requestMock = vi.mocked(axios.request);
    requestMock.mockResolvedValueOnce(createAccessCatalogResponse());
    requestMock.mockImplementationOnce(async (config) => {
      const signal = config.signal as AbortSignal | undefined;

      return await new Promise((_resolve, reject) => {
        signal?.addEventListener(
          'abort',
          () => {
            reject({
              code: 'ERR_CANCELED',
              isAxiosError: true,
            });
          },
          { once: true },
        );
      });
    });

    render(<PopupApp />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.change(screen.getByLabelText('API key'), {
      target: {
        value: 'sk-timeout',
      },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.queryByLabelText('API key')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Raw prompt'), {
      target: {
        value: 'Fix my slow React page',
      },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Optimize Prompt' }));
      await Promise.resolve();
    });

    expect(
      screen.getByRole('button', { name: 'Optimizing...' }),
    ).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
      await Promise.resolve();
    });

    expect(
      screen.getByRole('button', { name: 'Optimize Prompt' }),
    ).toBeEnabled();

    expect(
      screen.getByText(
        'Optimization timed out after 30 seconds. Please try again.',
      ),
    ).toBeInTheDocument();
  });
});
