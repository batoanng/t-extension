import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AccessCatalogResponse } from '@/shared/model/access';

import { readCachedCatalogSnapshot } from './accessCatalogCache';

function createCatalogSnapshot(
  providerId: string,
): AccessCatalogResponse | Record<string, unknown> {
  return {
    cacheTtlSeconds: 86_400,
    generatedAt: '2026-04-27T00:00:00.000Z',
    providers: [
      {
        defaultModelId: `${providerId}-model`,
        id: providerId,
        label: providerId,
        models: [
          {
            id: `${providerId}-model`,
            label: `${providerId} model`,
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
  };
}

function installIndexedDbSnapshot(snapshot: unknown) {
  const originalIndexedDb = globalThis.indexedDB;
  const store = {
    get: vi.fn(() => {
      const request = {
        error: null,
        onerror: null as ((event: Event) => void) | null,
        onsuccess: null as ((event: Event) => void) | null,
        result: snapshot,
      };

      queueMicrotask(() => {
        request.onsuccess?.(new Event('success'));
        transaction.oncomplete?.(new Event('complete'));
      });

      return request;
    }),
  };
  const transaction = {
    oncomplete: null as ((event: Event) => void) | null,
    onerror: null as ((event: Event) => void) | null,
    objectStore: vi.fn(() => store),
  };
  const database = {
    close: vi.fn(),
    createObjectStore: vi.fn(),
    objectStoreNames: {
      contains: vi.fn(() => true),
    },
    transaction: vi.fn(() => transaction),
  };
  const openRequest = {
    error: null,
    onerror: null as ((event: Event) => void) | null,
    onsuccess: null as ((event: Event) => void) | null,
    onupgradeneeded: null as ((event: Event) => void) | null,
    result: database,
  };

  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    value: {
      open: vi.fn(() => {
        queueMicrotask(() => {
          openRequest.onsuccess?.(new Event('success'));
        });

        return openRequest;
      }),
    },
  });

  return () => {
    Object.defineProperty(globalThis, 'indexedDB', {
      configurable: true,
      value: originalIndexedDb,
    });
  };
}

describe('access catalog cache', () => {
  let restoreIndexedDb: (() => void) | null = null;

  afterEach(() => {
    restoreIndexedDb?.();
    restoreIndexedDb = null;
  });

  it('returns valid cached catalog snapshots', async () => {
    const snapshot = createCatalogSnapshot('openai') as AccessCatalogResponse;
    restoreIndexedDb = installIndexedDbSnapshot(snapshot);

    await expect(readCachedCatalogSnapshot()).resolves.toEqual(snapshot);
  });

  it('ignores cached catalog snapshots with removed Grok providers', async () => {
    restoreIndexedDb = installIndexedDbSnapshot(createCatalogSnapshot('grok'));

    await expect(readCachedCatalogSnapshot()).resolves.toBeNull();
  });
});
