import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PopupApp } from './PopupApp';
import { __resetSavedApiKeyStoreForTests } from '@/features/api-key/model/useSavedApiKey';
import { __resetAccessStoreForTests } from '@/features/access/model/useAccessStore';

describe('PopupApp', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetSavedApiKeyStoreForTests();
    __resetAccessStoreForTests();
    vi.unstubAllGlobals();
    vi.stubGlobal('fetch', vi.fn());
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('disables optimization until an API key is saved', async () => {
    render(<PopupApp />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Optimize Prompt' })).toBeDisabled();
    });

    expect(
      screen.getByText('Add your OpenAI API key before optimizing prompts.'),
    ).toBeInTheDocument();
  });

  it('saves an API key and optimizes a prompt', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            currency: 'AUD',
            enabled: true,
            plan: 'pro',
            priceAudMonthly: 5,
            provider: 'deepseek',
          }),
          {
            headers: {
              'content-type': 'application/json',
            },
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          optimizedPrompt: 'Structured result',
          metadata: {
            credentialMode: 'byok',
            model: 'gpt-4o-mini',
            outputStyle: 'structured',
            provider: 'openai-byok',
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

    render(<PopupApp />);

    fireEvent.change(screen.getByLabelText('API key'), {
      target: {
        value: 'sk-test-key',
      },
    });
    const saveButton = screen.getByRole('button', { name: 'Save' });

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Replace API key' }),
      ).toBeInTheDocument();
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

  it('shows the Pro sign-in gate when the hosted mode is selected', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockImplementation(async () =>
      new Response(
        JSON.stringify({
          currency: 'AUD',
          enabled: true,
          plan: 'pro',
          priceAudMonthly: 5,
          provider: 'deepseek',
        }),
        {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
        },
      ),
    );

    render(<PopupApp />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Use my own key' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Developer Assistant Pro' }));

    await waitFor(() => {
      expect(
        screen.getByText('Sign in to subscribe and use hosted optimization.'),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Hosted Prompt Optimizer with the app\'s DeepSeek key')).toBeInTheDocument();
  });
});
