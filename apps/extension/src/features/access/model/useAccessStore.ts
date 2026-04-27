import { useSyncExternalStore } from 'react';

import {
  createCheckoutSession,
  createCustomerPortalSession,
  fetchMagicLinkStatus,
  fetchMySubscription,
  fetchSubscriptionOffering,
  logout,
  refreshAuthSession,
  requestMagicLink,
} from '@/shared/api';
import { env } from '@/shared/config';
import {
  getStoredJson,
  getStoredString,
  removeStoredString,
  setStoredJson,
  setStoredString,
  subscribeToStoredString,
} from '@/shared/lib/chromeStorage';
import {
  byokProviders,
  createDefaultByokConfig,
  type AccessIssue,
  AccessMode,
  type ByokProvider,
  getDefaultByokModel,
  MagicLinkStatus,
  getAccessGateMessage,
  resolveByokModel,
} from '@/shared/model/access';
import type {
  AccessSnapshot,
  OptimizeAccess,
  StoredByokConfig,
  StoredAuthSession,
  SubscriptionStatus,
} from '@/shared/model/access';
import {
  type PromptApiClientErrorCode,
  getPromptApiErrorMessage,
} from '@/shared/model/prompt';

const ACCESS_MODE_STORAGE_KEY = 'prompt_access_mode';
const ACCESS_PANEL_COLLAPSED_STORAGE_KEY = 'prompt_access_panel_collapsed';
const AUTH_SESSION_STORAGE_KEY = 'pro_auth_session';
const BYOK_CONFIG_STORAGE_KEY = 'byok_access_config';
const LEGACY_OPENAI_API_KEY_STORAGE_KEY = 'openai_api_key';
const accessTokenRefreshBufferMs = 30_000;
const magicLinkPollIntervalMs = 2_000;

const initialSnapshot: AccessSnapshot = {
  byok: createDefaultByokConfig(),
  mode: AccessMode.Byok,
  offering: {
    data: null,
    errorMessage: null,
    status: 'idle',
  },
  pro: {
    auth: {
      status: 'signed-out',
    },
    subscription: {
      status: 'idle',
      subscription: null,
    },
  },
  ui: {
    accessIssue: null,
    accessPanelCollapsed: false,
  },
  ready: false,
};

let currentSnapshot = initialSnapshot;
let currentAuthSession: StoredAuthSession | null = null;
let hasHydrated = false;
let releaseModeSubscription: (() => void) | null = null;
let releaseAccessPanelCollapsedSubscription: (() => void) | null = null;
let releaseByokConfigSubscription: (() => void) | null = null;
let releaseAuthSessionSubscription: (() => void) | null = null;
let magicLinkPollTimer: ReturnType<typeof setInterval> | null = null;
let refreshPromise: Promise<StoredAuthSession | null> | null = null;

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => {
    listener();
  });
}

function setSnapshot(snapshot: AccessSnapshot) {
  currentSnapshot = Object.freeze(snapshot);
  emitChange();
}

function updateSnapshot(updater: (snapshot: AccessSnapshot) => AccessSnapshot) {
  setSnapshot(updater(currentSnapshot));
}

function parseStoredBoolean(value: string | null): boolean | null {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
}

function parseStoredByokConfig(
  storedValue: string | null,
  legacyApiKey: string | null = null,
): StoredByokConfig {
  const fallback = createDefaultByokConfig();

  if (!storedValue) {
    return {
      ...fallback,
      apiKey: legacyApiKey?.trim() || null,
    };
  }

  try {
    const parsed = JSON.parse(storedValue) as Partial<StoredByokConfig>;
    const provider =
      parsed.provider &&
      typeof parsed.provider === 'string' &&
      byokProviders.includes(parsed.provider as ByokProvider)
        ? (parsed.provider as ByokProvider)
        : fallback.provider;
    const selectedModel =
      typeof parsed.selectedModel === 'string' && parsed.selectedModel.trim()
        ? parsed.selectedModel.trim()
        : getDefaultByokModel(provider);

    return {
      apiKey:
        typeof parsed.apiKey === 'string'
          ? parsed.apiKey.trim()
          : legacyApiKey?.trim() || null,
      customModel:
        typeof parsed.customModel === 'string' ? parsed.customModel : '',
      provider,
      selectedModel,
    };
  } catch {
    return {
      ...fallback,
      apiKey: legacyApiKey?.trim() || null,
    };
  }
}

function getDefaultAccessPanelCollapsed(input: {
  byokConfig: StoredByokConfig;
  mode: string | null;
  storedValue: string | null;
}) {
  const storedValue = parseStoredBoolean(input.storedValue);

  if (storedValue != null) {
    return storedValue;
  }

  return Boolean(input.byokConfig.apiKey);
}

function setAccessIssue(accessIssue: AccessIssue | null) {
  updateSnapshot((snapshot) => ({
    ...snapshot,
    ui: {
      ...snapshot.ui,
      accessIssue,
    },
  }));
}

function clearAccessIssue() {
  setAccessIssue(null);
}

async function setAccessPanelCollapsed(collapsed: boolean) {
  await setStoredString(
    ACCESS_PANEL_COLLAPSED_STORAGE_KEY,
    collapsed ? 'true' : 'false',
  );
  updateSnapshot((snapshot) => ({
    ...snapshot,
    ui: {
      ...snapshot.ui,
      accessPanelCollapsed: collapsed,
    },
  }));
}

function stopMagicLinkPolling() {
  if (!magicLinkPollTimer) {
    return;
  }

  clearInterval(magicLinkPollTimer);
  magicLinkPollTimer = null;
}

async function persistAuthSession(session: StoredAuthSession | null) {
  currentAuthSession = session;

  if (session) {
    await setStoredJson(AUTH_SESSION_STORAGE_KEY, session);
  } else {
    await removeStoredString(AUTH_SESSION_STORAGE_KEY);
  }
}

async function hydrateSnapshot() {
  const [mode, accessPanelCollapsed, byokConfigJson, legacyApiKey, authSession] =
    await Promise.all([
      getStoredString(ACCESS_MODE_STORAGE_KEY),
      getStoredString(ACCESS_PANEL_COLLAPSED_STORAGE_KEY),
      getStoredString(BYOK_CONFIG_STORAGE_KEY),
      getStoredString(LEGACY_OPENAI_API_KEY_STORAGE_KEY),
      getStoredJson<StoredAuthSession>(AUTH_SESSION_STORAGE_KEY),
    ]);
  const byokConfig = parseStoredByokConfig(byokConfigJson, legacyApiKey);

  currentAuthSession = authSession;

  setSnapshot({
    byok: byokConfig,
    mode: mode === AccessMode.Pro ? AccessMode.Pro : AccessMode.Byok,
    offering: currentSnapshot.offering,
    pro: {
      auth: authSession
        ? {
            status: 'signed-in',
            user: authSession.user,
          }
        : {
            status: 'signed-out',
          },
      subscription: authSession
        ? {
            status: 'loading',
            subscription: null,
          }
        : {
            status: 'idle',
            subscription: null,
          },
    },
    ui: {
      accessIssue: null,
      accessPanelCollapsed: getDefaultAccessPanelCollapsed({
        byokConfig,
        mode,
        storedValue: accessPanelCollapsed,
      }),
    },
    ready: true,
  });

  void refreshOffering();

  if (authSession) {
    void refreshSubscriptionStatus();
  }
}

function ensureHydrated() {
  if (hasHydrated) {
    return;
  }

  hasHydrated = true;
  releaseModeSubscription = subscribeToStoredString(
    ACCESS_MODE_STORAGE_KEY,
    (mode) => {
      updateSnapshot((snapshot) => ({
        ...snapshot,
        mode: mode === AccessMode.Pro ? AccessMode.Pro : AccessMode.Byok,
      }));
    },
  );
  releaseAccessPanelCollapsedSubscription = subscribeToStoredString(
    ACCESS_PANEL_COLLAPSED_STORAGE_KEY,
    (collapsedValue) => {
      updateSnapshot((snapshot) => ({
        ...snapshot,
        ui: {
          ...snapshot.ui,
          accessPanelCollapsed:
            parseStoredBoolean(collapsedValue) ??
            snapshot.ui.accessPanelCollapsed,
        },
      }));
    },
  );
  releaseByokConfigSubscription = subscribeToStoredString(
    BYOK_CONFIG_STORAGE_KEY,
    (byokConfigJson) => {
      updateSnapshot((snapshot) => ({
        ...snapshot,
        byok: parseStoredByokConfig(byokConfigJson, snapshot.byok.apiKey),
      }));
    },
  );
  releaseAuthSessionSubscription = subscribeToStoredString(
    AUTH_SESSION_STORAGE_KEY,
    (sessionJson) => {
      const session = sessionJson
        ? (JSON.parse(sessionJson) as StoredAuthSession)
        : null;
      currentAuthSession = session;
      updateSnapshot((snapshot) => ({
        ...snapshot,
        pro: {
          ...snapshot.pro,
          auth: session
            ? {
                status: 'signed-in',
                user: session.user,
              }
            : {
                status: 'signed-out',
              },
        },
      }));
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

async function refreshOffering() {
  updateSnapshot((snapshot) => ({
    ...snapshot,
    offering: {
      ...snapshot.offering,
      errorMessage: null,
      status: 'loading',
    },
  }));

  try {
    const offering = await fetchSubscriptionOffering(env.serverBaseUrl);
    updateSnapshot((snapshot) => ({
      ...snapshot,
      offering: {
        data: offering,
        errorMessage: null,
        status: 'ready',
      },
    }));
  } catch {
    updateSnapshot((snapshot) => ({
      ...snapshot,
      offering: {
        data: null,
        errorMessage: 'Unable to load shared hosted access pricing.',
        status: 'error',
      },
    }));
  }
}

async function clearAuthState() {
  stopMagicLinkPolling();
  await persistAuthSession(null);
  updateSnapshot((snapshot) => ({
    ...snapshot,
    pro: {
      auth: {
        status: 'signed-out',
      },
      subscription: {
        status: 'idle',
        subscription: null,
      },
    },
    ui: {
      ...snapshot.ui,
      accessIssue: null,
    },
  }));
}

async function ensureFreshSession() {
  if (!currentAuthSession) {
    return null;
  }

  if (
    currentAuthSession.accessTokenExpiresAt >
    Date.now() + accessTokenRefreshBufferMs
  ) {
    return currentAuthSession;
  }

  if (currentAuthSession.refreshTokenExpiresAt <= Date.now()) {
    await clearAuthState();
    return null;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  updateSnapshot((snapshot) => ({
    ...snapshot,
    pro: {
      ...snapshot.pro,
      auth: {
        status: 'refreshing',
      },
    },
  }));

  refreshPromise = refreshAuthSession({
    refreshToken: currentAuthSession.refreshToken,
    serverBaseUrl: env.serverBaseUrl,
  })
    .then(async (session) => {
      await persistAuthSession(session);
      updateSnapshot((snapshot) => ({
        ...snapshot,
        pro: {
          ...snapshot.pro,
          auth: session
            ? {
                status: 'signed-in',
                user: session.user,
              }
            : {
                status: 'signed-out',
              },
        },
      }));
      return session;
    })
    .catch(async () => {
      await clearAuthState();
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

function toSubscriptionState(subscription: SubscriptionStatus) {
  if (subscription.promptOptimization.enabled) {
    return {
      status: 'active' as const,
      subscription,
    };
  }

  return {
    message: 'Shared hosted access is not active for this account.',
    status: 'inactive' as const,
    subscription,
  };
}

async function refreshSubscriptionStatus() {
  const session = await ensureFreshSession();

  if (!session) {
    return null;
  }

  updateSnapshot((snapshot) => ({
    ...snapshot,
    pro: {
      ...snapshot.pro,
      subscription: {
        status: 'loading',
        subscription: snapshot.pro.subscription.subscription,
      },
    },
  }));

  try {
    const subscription = await fetchMySubscription({
      accessToken: session.accessToken,
      serverBaseUrl: env.serverBaseUrl,
    });
    const nextState = toSubscriptionState(subscription);

    updateSnapshot((snapshot) => ({
      ...snapshot,
      pro: {
        auth: {
          status: 'signed-in',
          user: session.user,
        },
        subscription: nextState,
      },
      ui: {
        ...snapshot.ui,
        accessIssue: null,
      },
    }));

    return nextState;
  } catch {
    updateSnapshot((snapshot) => ({
      ...snapshot,
      pro: {
        ...snapshot.pro,
        subscription: {
          message: 'Unable to refresh subscription status.',
          status: 'error',
          subscription: snapshot.pro.subscription.subscription,
        },
      },
    }));
    return null;
  }
}

async function pollMagicLinkStatus(requestId: string, email: string) {
  try {
    const result = await fetchMagicLinkStatus({
      requestId,
      serverBaseUrl: env.serverBaseUrl,
    });

    if (result.status === MagicLinkStatus.Pending) {
      return;
    }

    if (result.status === MagicLinkStatus.Expired || !result.auth) {
      stopMagicLinkPolling();
      updateSnapshot((snapshot) => ({
        ...snapshot,
        pro: {
          ...snapshot.pro,
          auth: {
            message: 'The sign-in link expired. Request a new one.',
            status: 'error',
          },
        },
      }));
      return;
    }

    stopMagicLinkPolling();
    const authSession = result.auth;

    updateSnapshot((snapshot) => ({
      ...snapshot,
      pro: {
        auth: {
          status: 'signed-in',
          user: authSession.user,
        },
        subscription: {
          status: 'loading',
          subscription: null,
        },
      },
      ui: {
        ...snapshot.ui,
        accessIssue: null,
      },
    }));
    await persistAuthSession(authSession);
    await refreshSubscriptionStatus();
  } catch {
    stopMagicLinkPolling();
    updateSnapshot((snapshot) => ({
      ...snapshot,
      pro: {
        ...snapshot.pro,
        auth: {
          message: `Unable to finish sign-in for ${email}.`,
          status: 'error',
        },
      },
    }));
  }
}

function startMagicLinkPolling(requestId: string, email: string) {
  stopMagicLinkPolling();
  magicLinkPollTimer = setInterval(() => {
    void pollMagicLinkStatus(requestId, email);
  }, magicLinkPollIntervalMs);
  void pollMagicLinkStatus(requestId, email);
}

async function setMode(mode: AccessMode) {
  await setStoredString(ACCESS_MODE_STORAGE_KEY, mode);
  updateSnapshot((snapshot) => ({
    ...snapshot,
    mode,
    ui: {
      ...snapshot.ui,
      accessIssue: null,
    },
  }));

  if (mode === AccessMode.Pro) {
    void refreshOffering();

    if (currentAuthSession) {
      void refreshSubscriptionStatus();
    }

    return;
  }

  if (!currentSnapshot.byok.apiKey) {
    await setAccessPanelCollapsed(false);
  }
}

async function saveByokConfig(input: StoredByokConfig) {
  const nextByokConfig: StoredByokConfig = {
    apiKey: input.apiKey?.trim() || null,
    customModel: input.customModel.trim(),
    provider: input.provider,
    selectedModel: input.selectedModel,
  };

  await setStoredJson(BYOK_CONFIG_STORAGE_KEY, nextByokConfig);
  await removeStoredString(LEGACY_OPENAI_API_KEY_STORAGE_KEY);
  updateSnapshot((snapshot) => ({
    ...snapshot,
    byok: nextByokConfig,
    ui: {
      ...snapshot.ui,
      accessIssue: null,
    },
  }));
  await setAccessPanelCollapsed(true);
}

async function removeByokConfig() {
  const resetByokConfig = {
    ...currentSnapshot.byok,
    apiKey: null,
  };

  await setStoredJson(BYOK_CONFIG_STORAGE_KEY, resetByokConfig);
  await removeStoredString(LEGACY_OPENAI_API_KEY_STORAGE_KEY);
  updateSnapshot((snapshot) => ({
    ...snapshot,
    byok: resetByokConfig,
    ui: {
      ...snapshot.ui,
      accessIssue: null,
    },
  }));
  await setAccessPanelCollapsed(false);
}

async function sendMagicLink(email: string) {
  clearAccessIssue();
  updateSnapshot((snapshot) => ({
    ...snapshot,
    pro: {
      ...snapshot.pro,
      auth: {
        pendingEmail: email.trim(),
        status: 'requesting-link',
      },
    },
  }));

  try {
    const response = await requestMagicLink({
      email,
      serverBaseUrl: env.serverBaseUrl,
    });

    updateSnapshot((snapshot) => ({
      ...snapshot,
      pro: {
        ...snapshot.pro,
        auth: {
          pendingEmail: email.trim(),
          pendingRequestId: response.authRequestId,
          status: 'waiting-for-verification',
        },
      },
    }));
    startMagicLinkPolling(response.authRequestId, email.trim());
  } catch {
    updateSnapshot((snapshot) => ({
      ...snapshot,
      pro: {
        ...snapshot.pro,
        auth: {
          message: 'Unable to send a sign-in link right now.',
          status: 'error',
        },
      },
    }));
  }
}

async function signOut() {
  const session = currentAuthSession;

  if (session) {
    await logout({
      refreshToken: session.refreshToken,
      serverBaseUrl: env.serverBaseUrl,
    }).catch(() => undefined);
  }

  await clearAuthState();
}

function reportOptimizeFailure(input: {
  accessKind: OptimizeAccess['kind'];
  errorCode: PromptApiClientErrorCode;
}) {
  if (input.accessKind === 'byok') {
    if (input.errorCode === 'BYOK_AUTH_FAILED') {
      setAccessIssue({
        code: 'invalid-api-key',
        message: getPromptApiErrorMessage('BYOK_AUTH_FAILED'),
      });
      return;
    }

    if (input.errorCode === 'MISSING_BYOK_API_KEY') {
      setAccessIssue({
        code: 'missing-api-key',
        message: getAccessGateMessage('missing-api-key'),
      });
    }

    return;
  }

  if (input.errorCode === 'AUTH_REQUIRED') {
    setAccessIssue({
      code: 'sign-in-required',
      message: getPromptApiErrorMessage('AUTH_REQUIRED'),
    });
    return;
  }

  if (input.errorCode === 'SUBSCRIPTION_REQUIRED') {
    setAccessIssue({
      code: 'subscription-required',
      message: getPromptApiErrorMessage('SUBSCRIPTION_REQUIRED'),
    });
    return;
  }

  if (input.errorCode === 'SUBSCRIPTION_INACTIVE') {
    setAccessIssue({
      code: 'subscription-inactive',
      message: getPromptApiErrorMessage('SUBSCRIPTION_INACTIVE'),
    });
    return;
  }

  if (input.errorCode === 'HOSTED_OPTIMIZATION_UNAVAILABLE') {
    setAccessIssue({
      code: 'offering-unavailable',
      message: getPromptApiErrorMessage('HOSTED_OPTIMIZATION_UNAVAILABLE'),
    });
  }
}

async function openCheckout() {
  const session = await ensureFreshSession();

  if (!session) {
    return;
  }

  const result = await createCheckoutSession({
    accessToken: session.accessToken,
    serverBaseUrl: env.serverBaseUrl,
  });

  globalThis.open?.(result.url, '_blank', 'noopener,noreferrer');
}

async function openCustomerPortal() {
  const session = await ensureFreshSession();

  if (!session) {
    return;
  }

  const result = await createCustomerPortalSession({
    accessToken: session.accessToken,
    serverBaseUrl: env.serverBaseUrl,
  });

  globalThis.open?.(result.url, '_blank', 'noopener,noreferrer');
}

async function prepareOptimizeAccess(): Promise<OptimizeAccess | null> {
  if (currentSnapshot.mode === AccessMode.Byok) {
    const resolvedModel = resolveByokModel(currentSnapshot.byok);

    if (!currentSnapshot.byok.apiKey || !resolvedModel) {
      return null;
    }

    return {
      apiKey: currentSnapshot.byok.apiKey,
      kind: 'byok',
      model: resolvedModel,
      provider: currentSnapshot.byok.provider,
    };
  }

  const session = await ensureFreshSession();

  if (!session) {
    return null;
  }

  const subscriptionState =
    currentSnapshot.pro.subscription.status === 'active'
      ? currentSnapshot.pro.subscription
      : await refreshSubscriptionStatus();

  if (!subscriptionState || subscriptionState.status !== 'active') {
    return null;
  }

  return {
    accessToken: session.accessToken,
    kind: 'subscription',
  };
}

export function __resetAccessStoreForTests() {
  stopMagicLinkPolling();
  releaseModeSubscription?.();
  releaseModeSubscription = null;
  releaseAccessPanelCollapsedSubscription?.();
  releaseAccessPanelCollapsedSubscription = null;
  releaseByokConfigSubscription?.();
  releaseByokConfigSubscription = null;
  releaseAuthSessionSubscription?.();
  releaseAuthSessionSubscription = null;
  refreshPromise = null;
  currentAuthSession = null;
  currentSnapshot = initialSnapshot;
  hasHydrated = false;
  listeners.clear();
}

export function useAccessStore() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...snapshot,
    clearAccessIssue,
    openCheckout,
    openCustomerPortal,
    prepareOptimizeAccess,
    reportOptimizeFailure,
    refreshOffering,
    refreshSubscriptionStatus,
    removeByokConfig,
    saveByokConfig,
    sendMagicLink,
    setAccessPanelCollapsed,
    setMode,
    signOut,
  };
}
