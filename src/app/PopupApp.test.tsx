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
import type { PageSnapshot } from '@/features/context-pack/lib/sourceAdapters';
import {
  CONTEXTPACK_ACTION_CLICKED_MESSAGE_TYPE,
  type ContextPackActionClickedMessage,
} from '@/shared/api';

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

function createPageSnapshot(input: {
  description: string;
  title: string;
  url?: string;
}): PageSnapshot {
  return {
    assignee: '',
    attachments: [],
    codeBlocks: [],
    comments: [],
    description: input.description,
    extractedAt: '2026-05-30T00:00:00.000Z',
    headings: [input.title],
    labels: [],
    linkedItems: [],
    metaDescription: '',
    priority: '',
    reporter: '',
    selectedText: '',
    status: '',
    tables: [],
    text: input.description,
    title: input.title,
    url: input.url ?? 'https://docs.example.com/spec',
  };
}

function stubChromeExtraction(snapshots: PageSnapshot[]) {
  const listeners = new Set<
    Parameters<typeof chrome.runtime.onMessage.addListener>[0]
  >();
  const fallbackSnapshot = snapshots[snapshots.length - 1];
  const executeScript = vi.fn().mockImplementation(async () => {
    const snapshot = snapshots.shift() ?? fallbackSnapshot;

    return snapshot ? [{ result: snapshot }] : [];
  });

  vi.stubGlobal('chrome', {
    runtime: {
      onMessage: {
        addListener: vi.fn((listener) => {
          listeners.add(listener);
        }),
        removeListener: vi.fn((listener) => {
          listeners.delete(listener);
        }),
      },
    },
    scripting: {
      executeScript,
    },
    tabs: {
      query: vi.fn().mockResolvedValue([
        {
          id: 123,
          title: 'Current page',
          url: 'https://docs.example.com/spec',
        },
      ]),
    },
  });

  return {
    emitActionClicked() {
      const message: ContextPackActionClickedMessage = {
        requestedAt: Date.now(),
        tabId: 123,
        type: CONTEXTPACK_ACTION_CLICKED_MESSAGE_TYPE,
        windowId: 1,
      };

      listeners.forEach((listener) => {
        listener(message, {}, vi.fn());
      });
    },
    executeScript,
  };
}

describe('PopupApp', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
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

  it('opens Generate and extracts context after saving BYOK access', async () => {
    stubChromeExtraction([
      createPageSnapshot({
        description: 'Automatically extracted after saving the key.',
        title: 'Saved Key Page',
      }),
    ]);

    render(<PopupApp />);

    await waitFor(() => {
      expect(screen.getByLabelText('API key')).toBeEnabled();
    });

    fireEvent.change(screen.getByLabelText('API key'), {
      target: {
        value: 'sk-new',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'ContextPackAI' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Generate' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(screen.getByLabelText('Context preview')).toHaveValue(
        'Title: Saved Key Page\n\nAutomatically extracted after saving the key.',
      );
    });
  });

  it('refreshes the active page context when the toolbar action message arrives', async () => {
    seedByokApiKey();
    const chromeStub = stubChromeExtraction([
      createPageSnapshot({
        description: 'Initial extracted content.',
        title: 'Initial Page',
      }),
      createPageSnapshot({
        description: 'Updated extracted content.',
        title: 'Updated Page',
      }),
    ]);

    render(<PopupApp />);

    await waitFor(() => {
      expect(screen.getByLabelText('Context preview')).toHaveValue(
        'Title: Initial Page\n\nInitial extracted content.',
      );
    });

    await act(async () => {
      chromeStub.emitActionClicked();
    });

    await waitFor(() => {
      expect(chromeStub.executeScript).toHaveBeenCalledTimes(2);
      expect(screen.getByLabelText('Context preview')).toHaveValue(
        'Title: Updated Page\n\nUpdated extracted content.',
      );
    });
  });

  it('falls back to manual context for restricted browser pages', async () => {
    seedByokApiKey();
    vi.stubGlobal('chrome', {
      runtime: {
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
      scripting: {
        executeScript: vi.fn(),
      },
      tabs: {
        query: vi.fn().mockResolvedValue([
          {
            id: 123,
            title: 'Chrome Extensions',
            url: 'chrome://extensions',
          },
        ]),
      },
    });

    render(<PopupApp />);

    await waitFor(() => {
      expect(screen.getByLabelText('Context preview')).toHaveValue(
        'Title: Chrome Extensions',
      );
      expect(screen.getByText('Detected: Manual Context')).toBeInTheDocument();
    });

    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
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
