export const accessModeValues = ['byok', 'pro'] as const;

export type AccessMode = (typeof accessModeValues)[number];

export interface StoredAuthSession {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
  refreshTokenExpiresAt: number;
  user: {
    email: string;
    id: string;
  };
}

export interface SubscriptionOffering {
  currency: 'AUD';
  enabled: boolean;
  plan: 'pro';
  priceAudMonthly: number;
  provider: 'deepseek';
}

export interface SubscriptionStatus {
  plan: 'free' | 'pro';
  promptOptimization: {
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    enabled: boolean;
    provider: 'byok' | 'deepseek';
    status: string;
  };
  user: {
    email: string;
    id: string;
  };
}

export type OptimizeAccess =
  | {
      accessToken: string;
      kind: 'subscription';
    }
  | {
      apiKey: string;
      kind: 'byok';
    };

export interface AccessSnapshot {
  byok: {
    apiKey: string | null;
  };
  mode: AccessMode;
  offering: {
    data: SubscriptionOffering | null;
    errorMessage: string | null;
    status: 'idle' | 'loading' | 'ready' | 'error';
  };
  pro: {
    auth:
      | {
          status: 'signed-in';
          user: StoredAuthSession['user'];
        }
      | {
          message?: string;
          pendingEmail?: string;
          pendingRequestId?: string;
          status:
            | 'signed-out'
            | 'requesting-link'
            | 'waiting-for-verification'
            | 'refreshing'
            | 'error';
        };
    subscription:
      | {
          status: 'active';
          subscription: SubscriptionStatus;
        }
      | {
          message?: string;
          status: 'idle' | 'loading' | 'inactive' | 'error';
          subscription: SubscriptionStatus | null;
        };
  };
  ready: boolean;
}

export type AccessGate =
  | {
      access: OptimizeAccess;
      kind: 'allowed';
    }
  | {
      kind: 'blocked';
      reason:
        | 'loading'
        | 'missing-api-key'
        | 'sign-in-required'
        | 'subscription-required'
        | 'subscription-loading'
        | 'offering-unavailable';
    };

export function getAccessGate(snapshot: AccessSnapshot): AccessGate {
  if (!snapshot.ready) {
    return {
      kind: 'blocked',
      reason: 'loading',
    };
  }

  if (snapshot.mode === 'byok') {
    if (!snapshot.byok.apiKey) {
      return {
        kind: 'blocked',
        reason: 'missing-api-key',
      };
    }

    return {
      kind: 'allowed',
      access: {
        apiKey: snapshot.byok.apiKey,
        kind: 'byok',
      },
    };
  }

  if (
    snapshot.offering.status === 'ready' &&
    snapshot.offering.data &&
    !snapshot.offering.data.enabled
  ) {
    return {
      kind: 'blocked',
      reason: 'offering-unavailable',
    };
  }

  if (
    snapshot.pro.auth.status === 'requesting-link' ||
    snapshot.pro.auth.status === 'waiting-for-verification' ||
    snapshot.pro.auth.status === 'refreshing'
  ) {
    return {
      kind: 'blocked',
      reason: 'loading',
    };
  }

  if (snapshot.pro.auth.status !== 'signed-in') {
    return {
      kind: 'blocked',
      reason: 'sign-in-required',
    };
  }

  if (snapshot.pro.subscription.status === 'loading') {
    return {
      kind: 'blocked',
      reason: 'subscription-loading',
    };
  }

  if (snapshot.pro.subscription.status !== 'active') {
    return {
      kind: 'blocked',
      reason: 'subscription-required',
    };
  }

  return {
    kind: 'allowed',
    access: {
      accessToken: '',
      kind: 'subscription',
    },
  };
}
