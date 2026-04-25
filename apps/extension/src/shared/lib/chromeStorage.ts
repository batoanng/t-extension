export const OPENAI_API_KEY_STORAGE_KEY = 'openai_api_key';

type StorageListener = (value: string | null) => void;

const localListeners = new Map<string, Set<StorageListener>>();

function getChromeStorageArea(): chrome.storage.StorageArea | null {
  return globalThis.chrome?.storage?.local ?? null;
}

function emitLocalStorageChange(key: string, value: string | null) {
  const listeners = localListeners.get(key);

  listeners?.forEach((listener) => {
    listener(value);
  });
}

export async function getStoredString(key: string): Promise<string | null> {
  const storageArea = getChromeStorageArea();

  if (storageArea) {
    const result = await storageArea.get(key);
    const value = result[key];

    return typeof value === 'string' ? value : null;
  }

  return globalThis.localStorage?.getItem(key) ?? null;
}

export async function setStoredString(
  key: string,
  value: string,
): Promise<void> {
  const storageArea = getChromeStorageArea();

  if (storageArea) {
    await storageArea.set({ [key]: value });
    return;
  }

  globalThis.localStorage?.setItem(key, value);
  emitLocalStorageChange(key, value);
}

export async function removeStoredString(key: string): Promise<void> {
  const storageArea = getChromeStorageArea();

  if (storageArea) {
    await storageArea.remove(key);
    return;
  }

  globalThis.localStorage?.removeItem(key);
  emitLocalStorageChange(key, null);
}

export function subscribeToStoredString(
  key: string,
  listener: StorageListener,
): () => void {
  const storageArea = getChromeStorageArea();

  if (storageArea && globalThis.chrome?.storage?.onChanged) {
    const handler: Parameters<
      typeof chrome.storage.onChanged.addListener
    >[0] = (changes, areaName) => {
      if (areaName !== 'local' || !(key in changes)) {
        return;
      }

      const changedValue = changes[key];
      listener(
        typeof changedValue?.newValue === 'string'
          ? changedValue.newValue
          : null,
      );
    };

    chrome.storage.onChanged.addListener(handler);

    return () => {
      chrome.storage.onChanged.removeListener(handler);
    };
  }

  const listeners = localListeners.get(key) ?? new Set<StorageListener>();
  listeners.add(listener);
  localListeners.set(key, listeners);

  const storageHandler = (event: StorageEvent) => {
    if (event.key === key) {
      listener(event.newValue);
    }
  };

  globalThis.addEventListener?.('storage', storageHandler);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      localListeners.delete(key);
    }

    globalThis.removeEventListener?.('storage', storageHandler);
  };
}
