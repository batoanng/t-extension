import type {
  StoredAuthSession,
  SubscriptionOffering,
  SubscriptionStatus,
} from '@/shared/model/access';

interface RequestMagicLinkResponse {
  authRequestId: string;
  expiresInSeconds: number;
}

interface MagicLinkStatusResponse {
  auth?: AuthResponse;
  status: 'pending' | 'completed' | 'expired';
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

function joinUrl(baseUrl: string, pathname: string) {
  return new URL(pathname, `${baseUrl.replace(/\/+$/, '')}/`).toString();
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text.trim().length === 0) {
    return null;
  }

  return JSON.parse(text);
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
  const response = await fetch(joinUrl(serverBaseUrl, '/api/v1/subscription/offering'));

  if (!response.ok) {
    throw new Error('Unable to load subscription offering.');
  }

  return (await readJson(response)) as SubscriptionOffering;
}

export async function requestMagicLink(input: {
  email: string;
  serverBaseUrl: string;
}) {
  const response = await fetch(joinUrl(input.serverBaseUrl, '/api/v1/auth/login'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email: input.email,
    }),
  });

  if (!response.ok) {
    throw new Error('Unable to send sign-in link.');
  }

  return (await readJson(response)) as RequestMagicLinkResponse;
}

export async function fetchMagicLinkStatus(input: {
  requestId: string;
  serverBaseUrl: string;
}) {
  const url = new URL(
    joinUrl(input.serverBaseUrl, '/api/v1/auth/magic-link-status'),
  );

  url.searchParams.set('requestId', input.requestId);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error('Unable to confirm sign-in.');
  }

  const data = (await readJson(response)) as MagicLinkStatusResponse;

  return {
    ...data,
    auth: data.auth ? toStoredAuthSession(data.auth) : undefined,
  };
}

export async function refreshAuthSession(input: {
  refreshToken: string;
  serverBaseUrl: string;
}) {
  const response = await fetch(joinUrl(input.serverBaseUrl, '/api/v1/auth/refresh'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      refreshToken: input.refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Unable to refresh session.');
  }

  return toStoredAuthSession((await readJson(response)) as AuthResponse);
}

export async function logout(input: {
  refreshToken: string;
  serverBaseUrl: string;
}) {
  await fetch(joinUrl(input.serverBaseUrl, '/api/v1/auth/logout'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      refreshToken: input.refreshToken,
    }),
  });
}

export async function fetchMySubscription(input: {
  accessToken: string;
  serverBaseUrl: string;
}) {
  const response = await fetch(joinUrl(input.serverBaseUrl, '/api/v1/subscription/me'), {
    headers: authHeaders(input.accessToken),
  });

  if (!response.ok) {
    throw new Error('Unable to load subscription status.');
  }

  return (await readJson(response)) as SubscriptionStatus;
}

export async function createCheckoutSession(input: {
  accessToken: string;
  serverBaseUrl: string;
}) {
  const response = await fetch(
    joinUrl(input.serverBaseUrl, '/api/v1/subscription/checkout-session'),
    {
      method: 'POST',
      headers: authHeaders(input.accessToken),
    },
  );

  if (!response.ok) {
    throw new Error('Unable to open checkout.');
  }

  return (await readJson(response)) as {
    url: string;
  };
}

export async function createCustomerPortalSession(input: {
  accessToken: string;
  serverBaseUrl: string;
}) {
  const response = await fetch(
    joinUrl(input.serverBaseUrl, '/api/v1/subscription/customer-portal'),
    {
      method: 'POST',
      headers: authHeaders(input.accessToken),
    },
  );

  if (!response.ok) {
    throw new Error('Unable to open billing portal.');
  }

  return (await readJson(response)) as {
    url: string;
  };
}
