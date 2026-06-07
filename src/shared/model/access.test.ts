import { describe, expect, it } from 'vitest';

import type { AccessCatalogResponse, AccessSnapshot } from './access';
import {
  AccessMode,
  getAccessGate,
  isAccessGateErrorReason,
  reconcileByokConfig,
} from './access';

function createCatalog(models: string[]): AccessCatalogResponse {
  return {
    cacheTtlSeconds: 86_400,
    generatedAt: '2026-04-27T00:00:00.000Z',
    providers: [
      {
        defaultModelId: models[0] ?? 'openrouter/auto',
        id: 'openrouter',
        label: 'OpenRouter',
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
        provider: 'openrouter',
        selectedModel: 'gpt-saved',
      }),
    ).toMatchObject({
      provider: 'openrouter',
      selectedModel: 'gpt-saved',
    });
  });

  it('falls back to the provider default when the live catalog removes a saved model', () => {
    expect(
      reconcileByokConfig(createCatalog(['gpt-default']), {
        apiKey: 'sk-test',
        provider: 'openrouter',
        selectedModel: 'gpt-removed',
      }),
    ).toMatchObject({
      provider: 'openrouter',
      selectedModel: 'gpt-default',
    });
  });
});

describe('getAccessGate', () => {
  it('blocks generation when the live catalog is unavailable', () => {
    const snapshot: AccessSnapshot = {
      byok: {
        apiKey: 'sk-test',
        provider: 'openrouter',
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
      },
    };

    expect(getAccessGate(snapshot)).toEqual({
      kind: 'blocked',
      reason: 'catalog-unavailable',
    });
  });
});

describe('isAccessGateErrorReason', () => {
  it('marks unavailable catalog blocks as errors while keeping loading neutral', () => {
    expect(isAccessGateErrorReason('catalog-unavailable')).toBe(true);
    expect(isAccessGateErrorReason('catalog-loading')).toBe(false);
    expect(isAccessGateErrorReason('loading')).toBe(false);
    expect(isAccessGateErrorReason('subscription-loading')).toBe(false);
  });
});
