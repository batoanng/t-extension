import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

function seedByokApiKey(apiKey = 'sk-test') {
  localStorage.setItem(
    'byok_access_config',
    JSON.stringify({
      apiKey,
      provider: 'openai',
      selectedModel: 'gpt-5.5',
    }),
  );
}

describe('PopupApp', () => {
  beforeEach(() => {
    localStorage.clear();
    __resetSavedApiKeyStoreForTests();
    __resetAccessStoreForTests();
    vi.clearAllMocks();
    vi.mocked(axios.request).mockReset();
    vi.mocked(axios.request).mockResolvedValue(createAccessCatalogResponse());
    Object.defineProperty(globalThis, 'open', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('defaults to Generation Access when no key is configured', () => {
    render(<PopupApp />);

    expect(
      screen.getByRole('heading', { name: 'Generation Access' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Access' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('defaults to ContextPackAI when a key is already configured', async () => {
    seedByokApiKey();

    render(<PopupApp />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'ContextPackAI' }),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Generate' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('shows the ContextPackAI about panel from the side rail', async () => {
    seedByokApiKey();

    render(<PopupApp />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'ContextPackAI' }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'About' }));

    expect(
      screen.getByRole('heading', { name: 'About ContextPackAI' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Convert Jira, Linear, GitHub issues, and selected text into role-specific markdown briefs.',
      ),
    ).toBeInTheDocument();
  });

  it('shows the author attribution with the LinkedIn link', () => {
    render(<PopupApp />);

    fireEvent.click(screen.getByRole('button', { name: 'Support' }));

    const link = screen.getByRole('link', { name: 'Ba Toan Nguyen' });

    expect(screen.getByText(/Built by/i)).toBeInTheDocument();
    expect(link).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/batoannguyen/',
    );
  });

  it('switches feature panels from the side rail', () => {
    render(<PopupApp />);

    expect(
      screen.getByRole('heading', { name: 'Generation Access' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(
      screen.getByRole('heading', { name: 'ContextPackAI' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Access' }));

    expect(
      screen.getByRole('heading', { name: 'Generation Access' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Recent' }));

    expect(
      screen.getByRole('heading', { name: 'Recent outputs' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Generated briefs will appear here after your first successful run.',
      ),
    ).toBeInTheDocument();
  });

  it('generates a developer brief from manually pasted context', async () => {
    seedByokApiKey();
    vi.mocked(axios.request)
      .mockResolvedValueOnce(createAccessCatalogResponse())
      .mockResolvedValueOnce(
        createAxiosResponse({
          confidence: 'high',
          createdAt: '2026-05-08T00:00:00.000Z',
          id: 'gen_123',
          markdown: '# Developer Implementation Brief',
          missingInformation: [],
          outputType: 'implementation_brief',
          questions: [],
          targetRole: 'developer',
          title: 'Developer Implementation Brief',
          warnings: [],
        }),
      );

    render(<PopupApp />);

    await waitFor(() => {
      expect(screen.getByLabelText('Context preview')).toHaveValue(
        'Title: Manual context',
      );
    });

    fireEvent.change(screen.getByLabelText('Manual paste fallback'), {
      target: {
        value: 'Build discount code validation for checkout.',
      },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Context preview')).toHaveValue(
        'Title: Manual context\n\nBuild discount code validation for checkout.',
      );
      expect(
        screen.getByRole('button', { name: 'Generate Brief' }),
      ).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generate Brief' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Markdown preview')).toHaveValue(
        '# Developer Implementation Brief',
      );
    });

    expect(axios.request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          context: expect.objectContaining({
            description: 'Build discount code validation for checkout.',
            sourceType: 'manual_paste',
          }),
          outputType: 'implementation_brief',
          targetRole: 'developer',
        }),
        method: 'POST',
        url: 'http://localhost:3000/api/v1/generations',
      }),
    );
  });
});
