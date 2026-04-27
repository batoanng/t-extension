import { describe, expect, it } from 'vitest';

import type { AccessCatalogResponse, AccessSnapshot } from './access';
import { AccessMode, getAccessGate, reconcileByokConfig } from './access';

function createCatalog(models: string[]): AccessCatalogResponse {
  return {
    cacheTtlSeconds: 86_400,
    generatedAt: '2026-04-27T00:00:00.000Z',
    providers: [
      {
        defaultModelId: models[0] ?? 'gpt-default',
        id: 'openai',
        label: 'OpenAI',
        models: models.map((model) => ({
          id: model,
          label: model,
        })),
      },
    ],
    sharedHostedOffering: {
      enabled: true,
      label: 'Author Shared Key',
      plan: 'pro',
      priceAudMonthly: 2,
    },
  };
}

describe('reconcileByokConfig', () => {
  it('keeps a saved model before the live catalog has loaded', () => {
    expect(
      reconcileByokConfig(null, {
        apiKey: 'sk-test',
        provider: 'openai',
        selectedModel: 'gpt-saved',
      }),
    ).toMatchObject({
      provider: 'openai',
      selectedModel: 'gpt-saved',
    });
  });

  it('falls back to the provider default when the live catalog removes a saved model', () => {
    expect(
      reconcileByokConfig(createCatalog(['gpt-default']), {
        apiKey: 'sk-test',
        provider: 'openai',
        selectedModel: 'gpt-removed',
      }),
    ).toMatchObject({
      provider: 'openai',
      selectedModel: 'gpt-default',
    });
  });
});

describe('getAccessGate', () => {
  it('blocks optimization when the live catalog is unavailable', () => {
    const snapshot: AccessSnapshot = {
      byok: {
        apiKey: 'sk-test',
        provider: 'openai',
        selectedModel: 'gpt-saved',
      },
      catalog: {
        data: null,
        errorMessage: 'Unable to load the provider catalog.',
        status: 'error',
      },
      mode: AccessMode.Byok,
      pro: {
        auth: {
          status: 'signed-out',
        },
        subscription: {
          status: 'idle',
          subscription: null,
        },
      },
      ready: true,
      ui: {
        accessIssue: null,
        accessPanelCollapsed: false,
      },
    };

    expect(getAccessGate(snapshot)).toEqual({
      kind: 'blocked',
      reason: 'catalog-unavailable',
    });
  });
});
