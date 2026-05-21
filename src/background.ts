import {
  ACCESS_CATALOG_MESSAGE_TYPE,
  type AccessCatalogMessageRequest,
  type AccessCatalogMessageResponse,
} from '@/shared/api';
import { joinUrl } from '@/shared/api/httpClient';
import {
  type AccessCatalogResponse,
  AccessCatalogResponseSchema,
} from '@/shared/model/access';

async function fetchCatalogFromNetwork(
  serverBaseUrl: string,
): Promise<AccessCatalogResponse> {
  const response = await fetch(
    joinUrl(serverBaseUrl, '/api/v1/access/catalog'),
    {
      headers: {
        accept: 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error('Unable to load access catalog.');
  }

  return AccessCatalogResponseSchema.parse(await response.json());
}

async function handleAccessCatalogMessage(
  serverBaseUrl: string,
): Promise<AccessCatalogMessageResponse> {
  try {
    const catalog = await fetchCatalogFromNetwork(serverBaseUrl);

    return {
      catalog,
      errorMessage: null,
      ok: true,
    };
  } catch {
    return {
      catalog: null,
      errorMessage: 'Unable to load access catalog.',
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

if (globalThis.chrome?.sidePanel) {
  if (globalThis.chrome?.action) {
    void chrome.action.setPopup({ popup: '' });
  }

  void chrome.sidePanel.setOptions({
    enabled: true,
    path: 'index.html',
  });

  void chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true,
  });
}

if (globalThis.chrome?.action?.onClicked && globalThis.chrome?.sidePanel) {
  chrome.action.onClicked.addListener((tab) => {
    const windowId = tab.windowId;

    if (typeof windowId !== 'number') {
      return;
    }

    void chrome.sidePanel.open({ windowId });
  });
}
