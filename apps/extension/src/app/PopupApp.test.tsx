import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetAccessStoreForTests } from '@/features/access/model/useAccessStore';
import { __resetSavedApiKeyStoreForTests } from '@/features/api-key/model/useSavedApiKey';

import { PopupApp } from './PopupApp';

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json',
    },
    status,
  });
}

function createOfferingResponse() {
  return createJsonResponse({
    currency: 'AUD',
    enabled: true,
    plan: 'pro',
    priceAudMonthly: 5,
    provider: 'deepseek',
  });
}

describe('PopupApp', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetSavedApiKeyStoreForTests();
    __resetAccessStoreForTests();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(createOfferingResponse()));
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
        'Rewrite rough engineering prompts into clearer instructions for AI coding agents.',
      ),
    ).not.toBeInTheDocument();

    fireEvent.focus(
      screen.getByRole('button', { name: 'About Prompt Optimizer' }),
    );

    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Rewrite rough engineering prompts into clearer instructions for AI coding agents.',
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

  it('auto-collapses in Pro mode and shows the blocked-access badge when sign-in is required', async () => {
    render(<PopupApp />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Developer Assistant Pro' }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Expand optimization access' }),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByLabelText('Optimization access needs attention'),
    ).toBeInTheDocument();
  });

  it('saves an API key and optimizes a prompt', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce(createOfferingResponse())
      .mockResolvedValueOnce(
        createJsonResponse({
          optimizedPrompt: 'Structured result',
          metadata: {
            credentialMode: 'byok',
            model: 'gpt-4o-mini',
            outputStyle: 'structured',
            provider: 'openai-byok',
            targetAgent: 'generic',
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

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('re-enables optimization and badges the access panel when the saved API key is rejected', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce(createOfferingResponse())
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            error: {
              code: 'OPENAI_AUTH_FAILED',
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
        screen.getByText('Your OpenAI API key appears to be invalid.'),
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
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValueOnce(createOfferingResponse());
    fetchMock.mockImplementationOnce(async (_input, init) => {
      const signal = init?.signal as AbortSignal | undefined;

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
    });
    vi.stubGlobal('fetch', fetchMock);

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
