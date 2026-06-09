import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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

function createAgentsResponse() {
  return createAxiosResponse({
    agents: [
      {
        category: 'planning',
        description: 'Plan work.',
        id: 'planner',
        name: 'Planner',
        tags: [],
      },
      {
        category: 'ci',
        description: 'CI expertise.',
        id: 'ci-expert',
        name: 'CI Expert',
        tags: [],
      },
      {
        category: 'data',
        description: 'Data analysis.',
        id: 'data-analyst',
        name: 'Data Analyst',
        tags: [],
      },
      {
        category: 'design',
        description: 'Design architecture.',
        id: 'design-architect',
        name: 'Design Architect',
        tags: [],
      },
      {
        category: 'security',
        description: 'Security architecture.',
        id: 'security-architect',
        name: 'Security Architect',
        tags: [],
      },
    ],
  });
}

/**
 * Routes mocked axios calls by request URL so tests do not depend on call
 * ordering. The agents and access-catalog GETs fire on mount in an
 * indeterminate order relative to feature requests, so they are matched by
 * URL while per-feature POST responses are supplied via `featureResponses`.
 */
function routeAxios(
  featureResponses: Partial<
    Record<'extraction' | 'generation' | 'visualization', unknown[]>
  > = {},
) {
  const queues = {
    extraction: [...(featureResponses.extraction ?? [])],
    generation: [...(featureResponses.generation ?? [])],
    visualization: [...(featureResponses.visualization ?? [])],
  };

  vi.mocked(axios.request).mockImplementation(
    async (config: { url?: string } = {}) => {
      const url = config.url ?? '';

      if (url.includes('/api/v1/agents')) {
        return createAgentsResponse();
      }

      if (url.includes('/api/v1/access/catalog')) {
        return createAccessCatalogResponse();
      }

      if (url.includes('/api/v1/generations')) {
        return queues.generation.shift() ?? createAccessCatalogResponse();
      }

      if (url.includes('/api/v1/extractions')) {
        return queues.extraction.shift() ?? createAccessCatalogResponse();
      }

      if (url.includes('/api/v1/visualizations')) {
        return queues.visualization.shift() ?? createAccessCatalogResponse();
      }

      return createAccessCatalogResponse();
    },
  );
}

function createAccessCatalogResponse() {
  return createAxiosResponse({
    cacheTtlSeconds: 86_400,
    generatedAt: '2026-04-27T00:00:00.000Z',
    providers: [
      {
        defaultModelId: 'openrouter/auto',
        id: 'openrouter',
        label: 'OpenRouter',
        models: [
          {
            id: 'openrouter/auto',
            label: 'OpenRouter Auto',
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
      provider: 'openrouter',
      selectedModel: 'openrouter/auto',
    }),
  );
}

function createDragDataTransfer(): DataTransfer {
  const data = new Map<string, string>();

  return {
    clearData: vi.fn(),
    dropEffect: 'none',
    effectAllowed: 'all',
    files: [] as unknown as FileList,
    getData: vi.fn((format: string) => data.get(format) ?? ''),
    items: [] as unknown as DataTransferItemList,
    setData: vi.fn((format: string, value: string) => {
      data.set(format, value);
    }),
    types: [],
  } as unknown as DataTransfer;
}

function getSequenceAgentLabels() {
  return within(screen.getByLabelText('Sequence agents'))
    .getAllByRole('checkbox')
    .map((checkbox) => checkbox.closest('label')?.textContent ?? '');
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

function stubChromeCapture(dataUrl = 'data:image/png;base64,aGVsbG8=') {
  const listeners = new Set<
    Parameters<typeof chrome.runtime.onMessage.addListener>[0]
  >();
  const captureVisibleTab = vi.fn().mockResolvedValue(dataUrl);

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
    tabs: {
      captureVisibleTab,
      query: vi.fn().mockResolvedValue([
        {
          id: 123,
          title: 'Visible Product Spec',
          url: 'https://docs.example.com/spec',
          windowId: 1,
        },
      ]),
    },
  });

  return {
    captureVisibleTab,
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
    routeAxios();
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

  it('defaults to OneAgent when a key is already configured', async () => {
    seedByokApiKey();

    render(<PopupApp />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'OneAgent' }),
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

    const rail = screen.getByRole('navigation', {
      name: 'OneAgent sections',
    });
    expect(
      within(rail)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['', '', '', '', '', '']);
    expect(
      within(rail)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual([
      'Generate',
      'Visualize',
      'Sequence',
      'Access',
      'Recent',
      'Support',
    ]);

    expect(
      screen.getByRole('heading', { name: 'Generation Access' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(
      screen.getByRole('heading', { name: 'OneAgent' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Visualize' }));

    expect(
      screen.getByRole('heading', { name: 'Visualize' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sequence' }));

    expect(
      screen.getByRole('heading', { name: 'Sequence' }),
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
        'Generated briefs and captured Markdown will appear here after your first successful run.',
      ),
    ).toBeInTheDocument();
  });

  it('shows catalog-unavailable access errors in red across generation tabs', async () => {
    seedByokApiKey();
    vi.mocked(axios.request).mockRejectedValue(new Error('offline'));
    const catalogUnavailableMessage =
      'The provider catalog is unavailable right now. Try again when you are back online.';

    render(<PopupApp />);

    await waitFor(() => {
      expect(screen.getByText(catalogUnavailableMessage)).toHaveAttribute(
        'data-tone',
        'error',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Visualize' }));

    await waitFor(() => {
      expect(screen.getByText(catalogUnavailableMessage)).toHaveAttribute(
        'data-tone',
        'error',
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sequence' }));

    await waitFor(() => {
      expect(screen.getByText(catalogUnavailableMessage)).toHaveAttribute(
        'data-tone',
        'error',
      );
    });
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
      expect(screen.getByLabelText('OpenRouter API key')).toBeEnabled();
    });

    fireEvent.change(screen.getByLabelText('OpenRouter API key'), {
      target: {
        value: 'sk-new',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'OneAgent' }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Generate' })).toHaveAttribute(
        'aria-current',
        'page',
      );
      expect(
        (screen.getByLabelText('Content') as HTMLTextAreaElement).value,
      ).toContain('Automatically extracted after saving the key.');
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
      expect(
        (screen.getByLabelText('Content') as HTMLTextAreaElement).value,
      ).toContain('Initial extracted content.');
    });

    await act(async () => {
      chromeStub.emitActionClicked();
    });

    await waitFor(() => {
      expect(chromeStub.executeScript).toHaveBeenCalledTimes(2);
      expect(
        (screen.getByLabelText('Content') as HTMLTextAreaElement).value,
      ).toContain('Updated extracted content.');
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
      expect(screen.getByLabelText('Content')).toHaveValue('Chrome Extensions');
    });

    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  it('generates a developer brief from manually pasted context', async () => {
    seedByokApiKey();
    routeAxios({
      generation: [
        createAxiosResponse({
          confidence: 'high',
          createdAt: '2026-05-08T00:00:00.000Z',
          id: 'gen_123',
          agentType: 'planner',
          markdown: '# Developer Implementation Brief',
          missingInformation: [],
          questions: [],
          title: 'Developer Implementation Brief',
          warnings: [],
        }),
      ],
    });

    render(<PopupApp />);

    await waitFor(() => {
      expect(screen.getByLabelText('Content')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('Content'), {
      target: {
        value: 'Build discount code validation for checkout.',
      },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Content')).toHaveValue(
        'Build discount code validation for checkout.',
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
          agentType: 'planner',
        }),
        method: 'POST',
        url: 'http://localhost:3000/api/v1/generations',
      }),
    );
  });

  it('captures the visible tab from Generate and appends extracted markdown', async () => {
    seedByokApiKey();
    const chromeStub = stubChromeCapture();
    routeAxios({
      extraction: [
        createAxiosResponse({
          confidence: 'high',
          createdAt: '2026-06-06T00:00:00.000Z',
          id: 'ext_123',
          markdown: '# Extracted visible tab',
          title: 'Visible Product Spec',
          warnings: [],
        }),
      ],
    });

    render(<PopupApp />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'OneAgent' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Capture screen/i }),
      ).toBeEnabled();
    });

    fireEvent.change(screen.getByLabelText('Content'), {
      target: {
        value: 'Existing manual notes.',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Capture screen/i }));

    await waitFor(() => {
      expect(chromeStub.captureVisibleTab).toHaveBeenCalledWith(1, {
        format: 'png',
      });
      expect(screen.getByLabelText('Content')).toHaveValue(
        'Existing manual notes.\n\n# Extracted visible tab',
      );
    });

    expect(axios.request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dataBase64: 'aGVsbG8=',
          mimeType: 'image/png',
          source: expect.objectContaining({
            title: 'Visible Product Spec',
            type: 'visible_tab',
            url: 'https://docs.example.com/spec',
          }),
        }),
        method: 'POST',
        url: 'http://localhost:3000/api/v1/extractions',
      }),
    );
  });

  it('creates a Mermaid visualization from selected recent outputs', async () => {
    seedByokApiKey();
    localStorage.setItem(
      'contextpackai_recent_outputs',
      JSON.stringify([
        {
          agentType: 'planner',
          context: {
            attachments: [],
            codeBlocks: [],
            comments: [],
            labels: [],
            linkedItems: [],
            sourceType: 'manual',
            tables: [],
            title: 'Checkout ticket',
          },
          createdAt: '2026-06-06T00:00:00.000Z',
          id: 'gen_1',
          kind: 'generation',
          markdown: '# Checkout brief',
          sourceTitle: 'Checkout ticket',
          title: 'Checkout brief',
        },
      ]),
    );
    routeAxios({
      visualization: [
        createAxiosResponse({
          createdAt: '2026-06-06T00:00:00.000Z',
          diagramType: 'graph',
          id: 'viz_1',
          mermaid: 'flowchart TD\n  A[Checkout] --> B[Discount validation]',
          title: 'Checkout graph',
          warnings: [],
        }),
      ],
    });

    render(<PopupApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Visualize' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Checkout brief/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Checkout brief/i));
    fireEvent.click(screen.getByRole('button', { name: /Create graph/i }));

    await waitFor(() => {
      expect(screen.getByLabelText('Mermaid source')).toHaveValue(
        'flowchart TD\n  A[Checkout] --> B[Discount validation]',
      );
    });

    expect(axios.request).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          diagramType: 'graph',
          items: [
            expect.objectContaining({
              id: 'gen_1',
              markdown: '# Checkout brief',
            }),
          ],
        }),
        method: 'POST',
        url: 'http://localhost:3000/api/v1/visualizations',
      }),
    );
  });

  it('runs selected sequence agents and persists only the final output', async () => {
    seedByokApiKey();
    routeAxios({
      generation: [
        createAxiosResponse({
          confidence: 'high',
          createdAt: '2026-06-06T00:00:00.000Z',
          id: 'gen_step_1',
          agentType: 'ci-expert',
          markdown: '# CI output',
          missingInformation: [],
          questions: [],
          title: 'CI output',
          warnings: [],
        }),
        createAxiosResponse({
          confidence: 'high',
          createdAt: '2026-06-06T00:01:00.000Z',
          id: 'gen_step_2',
          agentType: 'planner',
          markdown: '# Planner output',
          missingInformation: [],
          questions: [],
          title: 'Planner output',
          warnings: [],
        }),
      ],
    });

    render(<PopupApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Sequence' }));

    fireEvent.change(screen.getByLabelText('New content'), {
      target: {
        value: 'Build checkout validation.',
      },
    });
    fireEvent.click(screen.getByLabelText('CI Expert'));
    fireEvent.click(screen.getByRole('button', { name: 'Move CI Expert up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run sequence' }));

    await waitFor(() => {
      expect(
        screen.getByText('Sequence complete. Final output saved to Recent.'),
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Planner output')).toHaveValue(
        '# Planner output',
      );
    });

    const generationCalls = vi
      .mocked(axios.request)
      .mock.calls.filter(([config]) =>
        (config as { url?: string }).url?.includes('/api/v1/generations'),
      );

    expect(generationCalls).toHaveLength(2);
    expect(generationCalls[0]?.[0]).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          agentType: 'ci-expert',
        }),
      }),
    );
    expect(generationCalls[1]?.[0]).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          agentType: 'planner',
        }),
      }),
    );

    const storedOutputs = JSON.parse(
      localStorage.getItem('contextpackai_recent_outputs') ?? '[]',
    ) as Array<{ id: string; markdown: string }>;

    expect(storedOutputs).toEqual([
      expect.objectContaining({
        id: 'gen_step_2',
        markdown: '# Planner output',
      }),
    ]);
  });

  it('visibly reorders selected sequence agents with buttons and drag handles', async () => {
    seedByokApiKey();
    render(<PopupApp />);

    fireEvent.click(await screen.findByRole('button', { name: 'Sequence' }));
    fireEvent.click(screen.getByLabelText('CI Expert'));
    fireEvent.click(screen.getByLabelText('Data Analyst'));

    expect(getSequenceAgentLabels().slice(0, 3)).toEqual([
      'Planner',
      'CI Expert',
      'Data Analyst',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Move CI Expert up' }));

    expect(getSequenceAgentLabels().slice(0, 3)).toEqual([
      'CI Expert',
      'Planner',
      'Data Analyst',
    ]);

    const dataTransfer = createDragDataTransfer();
    const dragHandle = screen.getByLabelText('Drag Data Analyst');
    const targetRow = screen
      .getByLabelText('CI Expert')
      .closest('.agent-row') as HTMLElement;

    fireEvent.dragStart(dragHandle, { dataTransfer });
    fireEvent.dragOver(targetRow, { dataTransfer });
    fireEvent.drop(targetRow, { dataTransfer });

    expect(getSequenceAgentLabels().slice(0, 3)).toEqual([
      'Data Analyst',
      'CI Expert',
      'Planner',
    ]);
  });

  it('deletes recent outputs from local history', async () => {
    routeAxios();
    localStorage.setItem(
      'contextpackai_recent_outputs',
      JSON.stringify([
        {
          agentType: 'planner',
          context: {
            attachments: [],
            codeBlocks: [],
            comments: [],
            labels: [],
            linkedItems: [],
            sourceType: 'manual',
            tables: [],
            title: 'Ticket one',
          },
          createdAt: '2026-06-06T00:00:00.000Z',
          id: 'gen_1',
          kind: 'generation',
          markdown: '# One',
          sourceTitle: 'Ticket one',
          title: 'One',
        },
      ]),
    );

    render(<PopupApp />);

    fireEvent.click(screen.getByRole('button', { name: 'Recent' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Delete One' })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Delete One' }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Generated briefs and captured Markdown will appear here after your first successful run.',
        ),
      ).toBeInTheDocument();
    });

    expect(localStorage.getItem('contextpackai_recent_outputs')).toBe('[]');
  });
});
