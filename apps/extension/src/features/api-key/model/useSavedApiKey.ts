import { useSyncExternalStore } from 'react';
import {
  OPENAI_API_KEY_STORAGE_KEY,
  getStoredString,
  removeStoredString,
  setStoredString,
  subscribeToStoredString,
} from '@/shared/lib/chromeStorage';

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
  const apiKey = await getStoredString(OPENAI_API_KEY_STORAGE_KEY);

  if (currentSnapshot.ready) {
    return;
  }

  setSnapshot({
    apiKey,
    ready: true,
  });
}

function ensureHydrated() {
  if (hasHydrated) {
    return;
  }

  hasHydrated = true;
  releaseStorageSubscription = subscribeToStoredString(
    OPENAI_API_KEY_STORAGE_KEY,
    (apiKey) => {
      setSnapshot({
        apiKey,
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
      await setStoredString(OPENAI_API_KEY_STORAGE_KEY, trimmedApiKey);
      setSnapshot({
        apiKey: trimmedApiKey,
        ready: true,
      });
    },
    async removeApiKey() {
      await removeStoredString(OPENAI_API_KEY_STORAGE_KEY);
      setSnapshot({
        apiKey: null,
        ready: true,
      });
    },
  };
}
