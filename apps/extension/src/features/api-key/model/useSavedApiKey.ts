import { useSyncExternalStore } from 'react';
import {
  getStoredJson,
  getStoredString,
  removeStoredString,
  setStoredJson,
  setStoredString,
  subscribeToStoredString,
} from '@/shared/lib/chromeStorage';
import {
  createDefaultByokConfig,
  type StoredByokConfig,
} from '@/shared/model/access';

const BYOK_CONFIG_STORAGE_KEY = 'byok_access_config';
const LEGACY_OPENAI_API_KEY_STORAGE_KEY = 'openai_api_key';

interface SavedApiKeySnapshot {
  apiKey: string | null;
  ready: boolean;
}

const emptySnapshot: SavedApiKeySnapshot = Object.freeze({
  apiKey: null,
  ready: false,
});

let currentSnapshot = emptySnapshot;
let hasHydrated = false;
let releaseStorageSubscription: (() => void) | null = null;

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => {
    listener();
  });
}

function setSnapshot(snapshot: SavedApiKeySnapshot) {
  currentSnapshot = Object.freeze(snapshot);
  emitChange();
}

async function hydrateSnapshot() {
  const [byokConfig, legacyApiKey] = await Promise.all([
    getStoredJson<StoredByokConfig>(BYOK_CONFIG_STORAGE_KEY),
    getStoredString(LEGACY_OPENAI_API_KEY_STORAGE_KEY),
  ]);

  if (currentSnapshot.ready) {
    return;
  }

  setSnapshot({
    apiKey: byokConfig?.apiKey ?? legacyApiKey,
    ready: true,
  });
}

function ensureHydrated() {
  if (hasHydrated) {
    return;
  }

  hasHydrated = true;
  releaseStorageSubscription = subscribeToStoredString(
    BYOK_CONFIG_STORAGE_KEY,
    (configJson) => {
      let parsed: Partial<StoredByokConfig> = createDefaultByokConfig();

      if (configJson) {
        try {
          parsed = JSON.parse(configJson) as Partial<StoredByokConfig>;
        } catch {
          parsed = createDefaultByokConfig();
        }
      }

      setSnapshot({
        apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : null,
        ready: true,
      });
    },
  );
  void hydrateSnapshot();
}

function subscribe(listener: () => void) {
  ensureHydrated();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  ensureHydrated();
  return currentSnapshot;
}

export function __resetSavedApiKeyStoreForTests() {
  releaseStorageSubscription?.();
  releaseStorageSubscription = null;
  currentSnapshot = emptySnapshot;
  hasHydrated = false;
  listeners.clear();
}

export function useSavedApiKey() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    apiKey: snapshot.apiKey,
    hasApiKey: snapshot.apiKey != null && snapshot.apiKey.trim().length > 0,
    isReady: snapshot.ready,
    async saveApiKey(apiKey: string) {
      const trimmedApiKey = apiKey.trim();
      await setStoredJson(BYOK_CONFIG_STORAGE_KEY, {
        ...createDefaultByokConfig(),
        apiKey: trimmedApiKey,
      });
      await removeStoredString(LEGACY_OPENAI_API_KEY_STORAGE_KEY);
      setSnapshot({
        apiKey: trimmedApiKey,
        ready: true,
      });
    },
    async removeApiKey() {
      await setStoredJson(BYOK_CONFIG_STORAGE_KEY, {
        ...createDefaultByokConfig(),
        apiKey: null,
      });
      await removeStoredString(LEGACY_OPENAI_API_KEY_STORAGE_KEY);
      setSnapshot({
        apiKey: null,
        ready: true,
      });
    },
  };
}
