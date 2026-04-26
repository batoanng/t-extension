import type {
  MagicLinkStatus,
  StoredAuthSession,
  SubscriptionOffering,
  SubscriptionStatus,
} from '@/shared/model/access';

import { requestJson } from './httpClient';

interface RequestMagicLinkResponse {
  authRequestId: string;
  expiresInSeconds: number;
}

interface MagicLinkStatusResponse {
  auth?: AuthResponse;
  status: MagicLinkStatus;
}

interface AuthResponse {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
  tokenType: 'Bearer';
  user: {
    email: string;
    id: string;
  };
}

function authHeaders(accessToken: string) {
  return {
    authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json',
  };
}

function toStoredAuthSession(response: AuthResponse): StoredAuthSession {
  return {
    accessToken: response.accessToken,
    accessTokenExpiresAt: Date.now() + response.accessTokenExpiresIn * 1000,
    refreshToken: response.refreshToken,
    refreshTokenExpiresAt: Date.now() + response.refreshTokenExpiresIn * 1000,
    user: response.user,
  };
}

export async function fetchSubscriptionOffering(serverBaseUrl: string) {
  const response = await requestJson<SubscriptionOffering>({
    baseUrl: serverBaseUrl,
    pathname: '/api/v1/subscription/offering',
  });

  if (response.status < 200 || response.status >= 300 || !response.data) {
    throw new Error('Unable to load subscription offering.');
  }

  return response.data;
}

export async function requestMagicLink(input: {
  email: string;
  serverBaseUrl: string;
}) {
  const response = await requestJson<RequestMagicLinkResponse>({
    baseUrl: input.serverBaseUrl,
    data: {
      email: input.email,
    },
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
    pathname: '/api/v1/auth/login',
  });

  if (response.status < 200 || response.status >= 300 || !response.data) {
    throw new Error('Unable to send sign-in link.');
  }

  return response.data;
}

export async function fetchMagicLinkStatus(input: {
  requestId: string;
  serverBaseUrl: string;
}) {
  const response = await requestJson<MagicLinkStatusResponse>({
    baseUrl: input.serverBaseUrl,
    params: {
      requestId: input.requestId,
    },
    pathname: '/api/v1/auth/magic-link-status',
  });

  if (response.status < 200 || response.status >= 300 || !response.data) {
    throw new Error('Unable to confirm sign-in.');
  }

  const data = response.data;

  return {
    ...data,
    auth: data.auth ? toStoredAuthSession(data.auth) : undefined,
  };
}

export async function refreshAuthSession(input: {
  refreshToken: string;
  serverBaseUrl: string;
}) {
  const response = await requestJson<AuthResponse>({
    baseUrl: input.serverBaseUrl,
    data: {
      refreshToken: input.refreshToken,
    },
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
    pathname: '/api/v1/auth/refresh',
  });

  if (response.status < 200 || response.status >= 300 || !response.data) {
    throw new Error('Unable to refresh session.');
  }

  return toStoredAuthSession(response.data);
}

export async function logout(input: {
  refreshToken: string;
  serverBaseUrl: string;
}) {
  await requestJson({
    baseUrl: input.serverBaseUrl,
    data: {
      refreshToken: input.refreshToken,
    },
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
    pathname: '/api/v1/auth/logout',
  });
}

export async function fetchMySubscription(input: {
  accessToken: string;
  serverBaseUrl: string;
}) {
  const response = await requestJson<SubscriptionStatus>({
    baseUrl: input.serverBaseUrl,
    headers: authHeaders(input.accessToken),
    pathname: '/api/v1/subscription/me',
  });

  if (response.status < 200 || response.status >= 300 || !response.data) {
    throw new Error('Unable to load subscription status.');
  }

  return response.data;
}

export async function createCheckoutSession(input: {
  accessToken: string;
  serverBaseUrl: string;
}) {
  const response = await requestJson<{ url: string }>({
    baseUrl: input.serverBaseUrl,
    headers: authHeaders(input.accessToken),
    method: 'POST',
    pathname: '/api/v1/subscription/checkout-session',
  });

  if (response.status < 200 || response.status >= 300 || !response.data) {
    throw new Error('Unable to open checkout.');
  }

  return response.data;
}

export async function createCustomerPortalSession(input: {
  accessToken: string;
  serverBaseUrl: string;
}) {
  const response = await requestJson<{ url: string }>({
    baseUrl: input.serverBaseUrl,
    headers: authHeaders(input.accessToken),
    method: 'POST',
    pathname: '/api/v1/subscription/customer-portal',
  });

  if (response.status < 200 || response.status >= 300 || !response.data) {
    throw new Error('Unable to open billing portal.');
  }

  return response.data;
}
