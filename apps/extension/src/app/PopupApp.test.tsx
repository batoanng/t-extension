import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PopupApp } from './PopupApp';
import { __resetSavedApiKeyStoreForTests } from '@/features/api-key/model/useSavedApiKey';

describe('PopupApp', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetSavedApiKeyStoreForTests();
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
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          optimizedPrompt: 'Structured result',
          metadata: {
            model: 'gpt-4o-mini',
            outputStyle: 'structured',
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

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
