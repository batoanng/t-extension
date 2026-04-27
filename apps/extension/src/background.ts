import {
  ACCESS_CATALOG_MESSAGE_TYPE,
  type AccessCatalogMessageRequest,
  type AccessCatalogMessageResponse,
} from '@/shared/api';
import { joinUrl } from '@/shared/api/httpClient';
import {
  createCatalogMetadata,
  getCatalogFreshness,
  readCachedCatalogSnapshot,
  writeCachedCatalogSnapshot,
} from '@/shared/lib/accessCatalogCache';
import {
  AccessCatalogResponseSchema,
  type AccessCatalogResponse,
} from '@/shared/model/access';

const ACCESS_CATALOG_CACHE_NAME = 'access-catalog-http-v1';

async function readCachedCatalogFromHttpCache(
  requestUrl: string,
): Promise<AccessCatalogResponse | null> {
  if (!('caches' in globalThis) || !globalThis.caches) {
    return null;
  }

  try {
    const cache = await globalThis.caches.open(ACCESS_CATALOG_CACHE_NAME);
    const response = await cache.match(requestUrl);

    if (!response) {
      return null;
    }

    const json = await response.json();

    return AccessCatalogResponseSchema.parse(json);
  } catch {
    return null;
  }
}

async function writeCatalogToHttpCache(
  requestUrl: string,
  catalog: AccessCatalogResponse,
): Promise<void> {
  if (!('caches' in globalThis) || !globalThis.caches) {
    return;
  }

  try {
    const cache = await globalThis.caches.open(ACCESS_CATALOG_CACHE_NAME);

    await cache.put(
      requestUrl,
      new Response(JSON.stringify(catalog), {
        headers: {
          'content-type': 'application/json',
        },
      }),
    );
  } catch {
    return;
  }
}

async function readLastKnownCatalog(
  requestUrl: string,
): Promise<AccessCatalogResponse | null> {
  const cachedHttpCatalog = await readCachedCatalogFromHttpCache(requestUrl);

  if (cachedHttpCatalog) {
    return cachedHttpCatalog;
  }

  return await readCachedCatalogSnapshot();
}

async function fetchCatalogFromNetwork(
  serverBaseUrl: string,
): Promise<AccessCatalogResponse> {
  const response = await fetch(joinUrl(serverBaseUrl, '/api/v1/access/catalog'), {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Unable to load access catalog.');
  }

  return AccessCatalogResponseSchema.parse(await response.json());
}

async function persistCatalog(
  requestUrl: string,
  catalog: AccessCatalogResponse,
): Promise<void> {
  await Promise.all([
    writeCatalogToHttpCache(requestUrl, catalog),
    writeCachedCatalogSnapshot(catalog),
  ]);
}

async function handleAccessCatalogMessage(
  serverBaseUrl: string,
): Promise<AccessCatalogMessageResponse> {
  const requestUrl = joinUrl(serverBaseUrl, '/api/v1/access/catalog');
  const cachedCatalog = await readLastKnownCatalog(requestUrl);

  if (cachedCatalog) {
    const freshness = getCatalogFreshness(createCatalogMetadata(cachedCatalog));

    if (freshness === 'fresh') {
      return {
        catalog: cachedCatalog,
        errorMessage: null,
        freshness,
        ok: true,
      };
    }
  }

  try {
    const catalog = await fetchCatalogFromNetwork(serverBaseUrl);
    await persistCatalog(requestUrl, catalog);

    return {
      catalog,
      errorMessage: null,
      freshness: 'fresh',
      ok: true,
    };
  } catch {
    if (cachedCatalog) {
      return {
        catalog: cachedCatalog,
        errorMessage: null,
        freshness: 'offline-cached',
        ok: true,
      };
    }

    return {
      catalog: null,
      errorMessage: 'Unable to load access catalog.',
      freshness: null,
      ok: false,
    };
  }
}

if (globalThis.chrome?.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const typedMessage = message as AccessCatalogMessageRequest | undefined;

    if (typedMessage?.type !== ACCESS_CATALOG_MESSAGE_TYPE) {
      return false;
    }

    void handleAccessCatalogMessage(typedMessage.serverBaseUrl).then(
      sendResponse,
    );

    return true;
  });
}
