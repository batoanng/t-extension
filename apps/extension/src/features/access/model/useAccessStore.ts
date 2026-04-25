import { useSyncExternalStore } from 'react';
import { env } from '@/shared/config';
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
import type {
  AccessMode,
  AccessSnapshot,
  OptimizeAccess,
  StoredAuthSession,
  SubscriptionStatus,
} from '@/shared/model/access';
import {
  getStoredJson,
  getStoredString,
  removeStoredString,
  setStoredJson,
  setStoredString,
  subscribeToStoredString,
} from '@/shared/lib/chromeStorage';

const ACCESS_MODE_STORAGE_KEY = 'prompt_access_mode';
const AUTH_SESSION_STORAGE_KEY = 'pro_auth_session';
const OPENAI_API_KEY_STORAGE_KEY = 'openai_api_key';
const accessTokenRefreshBufferMs = 30_000;
const magicLinkPollIntervalMs = 2_000;

const initialSnapshot: AccessSnapshot = {
  byok: {
    apiKey: null,
  },
  mode: 'byok',
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
  ready: false,
};

let currentSnapshot = initialSnapshot;
let currentAuthSession: StoredAuthSession | null = null;
let hasHydrated = false;
let releaseModeSubscription: (() => void) | null = null;
let releaseApiKeySubscription: (() => void) | null = null;
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
  const [mode, apiKey, authSession] = await Promise.all([
    getStoredString(ACCESS_MODE_STORAGE_KEY),
    getStoredString(OPENAI_API_KEY_STORAGE_KEY),
    getStoredJson<StoredAuthSession>(AUTH_SESSION_STORAGE_KEY),
  ]);

  currentAuthSession = authSession;

  setSnapshot({
    byok: {
      apiKey,
    },
    mode: mode === 'pro' ? 'pro' : 'byok',
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
        mode: mode === 'pro' ? 'pro' : 'byok',
      }));
    },
  );
  releaseApiKeySubscription = subscribeToStoredString(
    OPENAI_API_KEY_STORAGE_KEY,
    (apiKey) => {
      updateSnapshot((snapshot) => ({
        ...snapshot,
        byok: {
          apiKey,
        },
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
        errorMessage: 'Unable to load Developer Assistant Pro pricing.',
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
  }));
}

async function ensureFreshSession() {
  if (!currentAuthSession) {
    return null;
  }

  if (currentAuthSession.accessTokenExpiresAt > Date.now() + accessTokenRefreshBufferMs) {
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
    message: 'Developer Assistant Pro is not active for this account.',
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

    if (result.status === 'pending') {
      return;
    }

    if (result.status === 'expired' || !result.auth) {
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
  }));

  if (mode === 'pro') {
    void refreshOffering();

    if (currentAuthSession) {
      void refreshSubscriptionStatus();
    }
  }
}

async function saveApiKey(apiKey: string) {
  await setStoredString(OPENAI_API_KEY_STORAGE_KEY, apiKey.trim());
}

async function removeApiKey() {
  await removeStoredString(OPENAI_API_KEY_STORAGE_KEY);
}

async function sendMagicLink(email: string) {
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
  if (currentSnapshot.mode === 'byok') {
    if (!currentSnapshot.byok.apiKey) {
      return null;
    }

    return {
      apiKey: currentSnapshot.byok.apiKey,
      kind: 'byok',
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
  releaseApiKeySubscription?.();
  releaseApiKeySubscription = null;
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
    openCheckout,
    openCustomerPortal,
    prepareOptimizeAccess,
    refreshOffering,
    refreshSubscriptionStatus,
    removeApiKey,
    saveApiKey,
    sendMagicLink,
    setMode,
    signOut,
  };
}
