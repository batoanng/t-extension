import type {
  AccessCatalogFreshness,
  AccessCatalogResponse,
  CachedAccessCatalogMetadata,
} from '@/shared/model/access';

const ACCESS_CATALOG_CACHE_VERSION = 1;
const ACCESS_CATALOG_DB_NAME = 'developer-assistant-cache';
const ACCESS_CATALOG_DB_VERSION = 1;
const ACCESS_CATALOG_STORE_NAME = 'access-catalog';
const ACCESS_CATALOG_SNAPSHOT_KEY = 'snapshot';
const ACCESS_CATALOG_METADATA_STORAGE_KEY = 'access_catalog_metadata';

function getLocalStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return value != null && typeof value === 'object';
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (!('indexedDB' in globalThis) || !globalThis.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise<IDBDatabase | null>((resolve, reject) => {
    const request = globalThis.indexedDB.open(
      ACCESS_CATALOG_DB_NAME,
      ACCESS_CATALOG_DB_VERSION,
    );

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(ACCESS_CATALOG_STORE_NAME)) {
        database.createObjectStore(ACCESS_CATALOG_STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  }).catch(() => null);
}

function toCatalogMetadata(
  value: unknown,
): CachedAccessCatalogMetadata | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.version !== 'number' ||
    typeof value.generatedAt !== 'string' ||
    typeof value.expiresAt !== 'number'
  ) {
    return null;
  }

  return {
    expiresAt: value.expiresAt,
    generatedAt: value.generatedAt,
    version: value.version,
  };
}

export function calculateCatalogExpiresAt(
  catalog: AccessCatalogResponse,
): number {
  const generatedAt = Date.parse(catalog.generatedAt);
  const baseTime = Number.isFinite(generatedAt) ? generatedAt : Date.now();

  return baseTime + catalog.cacheTtlSeconds * 1000;
}

export function getCatalogFreshness(
  metadata: CachedAccessCatalogMetadata | null,
  now = Date.now(),
): AccessCatalogFreshness {
  if (!metadata) {
    return 'stale';
  }

  return metadata.expiresAt > now ? 'fresh' : 'stale';
}

export function createCatalogMetadata(
  catalog: AccessCatalogResponse,
): CachedAccessCatalogMetadata {
  return {
    expiresAt: calculateCatalogExpiresAt(catalog),
    generatedAt: catalog.generatedAt,
    version: ACCESS_CATALOG_CACHE_VERSION,
  };
}

export function readCatalogMetadata(): CachedAccessCatalogMetadata | null {
  const storage = getLocalStorage();
  const rawValue = storage?.getItem(ACCESS_CATALOG_METADATA_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return toCatalogMetadata(JSON.parse(rawValue));
  } catch {
    return null;
  }
}

export function writeCatalogMetadata(
  metadata: CachedAccessCatalogMetadata,
): void {
  const storage = getLocalStorage();

  storage?.setItem(
    ACCESS_CATALOG_METADATA_STORAGE_KEY,
    JSON.stringify(metadata),
  );
}

export async function readCachedCatalogSnapshot(): Promise<AccessCatalogResponse | null> {
  const database = await openDatabase();

  if (!database) {
    return null;
  }

  return await new Promise<AccessCatalogResponse | null>((resolve, reject) => {
    const transaction = database.transaction(ACCESS_CATALOG_STORE_NAME, 'readonly');
    const store = transaction.objectStore(ACCESS_CATALOG_STORE_NAME);
    const request = store.get(ACCESS_CATALOG_SNAPSHOT_KEY);

    request.onsuccess = () => {
      resolve((request.result as AccessCatalogResponse | undefined) ?? null);
    };
    request.onerror = () => {
      reject(request.error);
    };
    transaction.oncomplete = () => {
      database.close();
    };
    transaction.onerror = () => {
      database.close();
    };
  }).catch(() => null);
}

export async function writeCachedCatalogSnapshot(
  catalog: AccessCatalogResponse,
): Promise<void> {
  const database = await openDatabase();

  if (!database) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(ACCESS_CATALOG_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(ACCESS_CATALOG_STORE_NAME);

    store.put(catalog, ACCESS_CATALOG_SNAPSHOT_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  }).catch(() => undefined);
}
