import {
  ACCESS_CATALOG_MESSAGE_TYPE,
  CONTEXTPACK_ACTION_CLICKED_MESSAGE_TYPE,
  type AccessCatalogMessageRequest,
  type AccessCatalogMessageResponse,
  type ContextPackActionClickedMessage,
  fetchAccessCatalog,
} from '@/shared/api';

async function handleAccessCatalogMessage(): Promise<AccessCatalogMessageResponse> {
  try {
    const catalog = await fetchAccessCatalog();

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

    void handleAccessCatalogMessage().then(sendResponse);

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
    const message: ContextPackActionClickedMessage = {
      requestedAt: Date.now(),
      tabId: tab.id,
      type: CONTEXTPACK_ACTION_CLICKED_MESSAGE_TYPE,
      windowId,
    };

    void chrome.runtime.sendMessage(message).catch(() => undefined);

    if (typeof windowId !== 'number') {
      return;
    }

    void chrome.sidePanel.open({ windowId });
  });
}
