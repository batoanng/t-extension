import { env } from '@/shared/config';
import type {
  AccessCatalogResponse,
  MagicLinkStatus,
  StoredAuthSession,
  SubscriptionStatus,
} from '@/shared/model/access';
import { AccessCatalogResponseSchema } from '@/shared/model/access';

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

export const ACCESS_CATALOG_MESSAGE_TYPE = 'access-catalog:get';

export interface AccessCatalogMessageRequest {
  type: typeof ACCESS_CATALOG_MESSAGE_TYPE;
}

export interface AccessCatalogMessageResponse {
  catalog: AccessCatalogResponse | null;
  errorMessage: string | null;
  ok: boolean;
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

export async function fetchAccessCatalog() {
  const response = await requestJson<AccessCatalogResponse>({
    baseUrl: env.serverBaseUrl,
    pathname: '/api/v1/access/catalog',
  });

  if (response.status < 200 || response.status >= 300 || !response.data) {
    throw new Error('Unable to load access catalog.');
  }

  return AccessCatalogResponseSchema.parse(response.data);
}

export async function requestAccessCatalogFromBackground(): Promise<AccessCatalogMessageResponse> {
  if (!globalThis.chrome?.runtime?.sendMessage) {
    const catalog = await fetchAccessCatalog();

    return {
      catalog,
      errorMessage: null,
      ok: true,
    };
  }

  return await new Promise<AccessCatalogMessageResponse>((resolve) => {
    try {
      chrome.runtime.sendMessage<
        AccessCatalogMessageRequest,
        AccessCatalogMessageResponse
      >(
        {
          type: ACCESS_CATALOG_MESSAGE_TYPE,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({
              catalog: null,
              errorMessage:
                chrome.runtime.lastError.message ??
                'Unable to load access catalog.',
              ok: false,
            });
            return;
          }

          resolve(
            response ?? {
              catalog: null,
              errorMessage: 'Unable to load access catalog.',
              ok: false,
            },
          );
        },
      );
    } catch {
      resolve({
        catalog: null,
        errorMessage: 'Unable to load access catalog.',
        ok: false,
      });
    }
  });
}

export async function requestMagicLink(input: { email: string }) {
  const response = await requestJson<RequestMagicLinkResponse>({
    baseUrl: env.serverBaseUrl,
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

export async function fetchMagicLinkStatus(input: { requestId: string }) {
  const response = await requestJson<MagicLinkStatusResponse>({
    baseUrl: env.serverBaseUrl,
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

export async function refreshAuthSession(input: { refreshToken: string }) {
  const response = await requestJson<AuthResponse>({
    baseUrl: env.serverBaseUrl,
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

export async function logout(input: { refreshToken: string }) {
  await requestJson({
    baseUrl: env.serverBaseUrl,
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

export async function fetchMySubscription(input: { accessToken: string }) {
  const response = await requestJson<SubscriptionStatus>({
    baseUrl: env.serverBaseUrl,
    headers: authHeaders(input.accessToken),
    pathname: '/api/v1/subscription/me',
  });

  if (response.status < 200 || response.status >= 300 || !response.data) {
    throw new Error('Unable to load subscription status.');
  }

  return response.data;
}

export async function createCheckoutSession(input: { accessToken: string }) {
  const response = await requestJson<{ url: string }>({
    baseUrl: env.serverBaseUrl,
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
}) {
  const response = await requestJson<{ url: string }>({
    baseUrl: env.serverBaseUrl,
    headers: authHeaders(input.accessToken),
    method: 'POST',
    pathname: '/api/v1/subscription/customer-portal',
  });

  if (response.status < 200 || response.status >= 300 || !response.data) {
    throw new Error('Unable to open billing portal.');
  }

  return response.data;
}
