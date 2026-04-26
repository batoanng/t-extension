export enum AccessMode {
  Byok = 'byok',
  Pro = 'pro',
}

export enum MagicLinkStatus {
  Pending = 'pending',
  Completed = 'completed',
  Expired = 'expired',
}

export type AccessIssueCode =
  | 'invalid-api-key'
  | 'missing-api-key'
  | 'offering-unavailable'
  | 'sign-in-required'
  | 'subscription-inactive'
  | 'subscription-required';

export interface AccessIssue {
  code: AccessIssueCode;
  message: string;
}

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
  ui: {
    accessIssue: AccessIssue | null;
    accessPanelCollapsed: boolean;
  };
  ready: boolean;
}

export type AccessGateBlockedReason =
  | 'loading'
  | 'missing-api-key'
  | 'sign-in-required'
  | 'subscription-required'
  | 'subscription-loading'
  | 'offering-unavailable';

export type AccessGate =
  | {
      access: OptimizeAccess;
      kind: 'allowed';
    }
  | {
      kind: 'blocked';
      reason: AccessGateBlockedReason;
    };

export function getAccessGate(snapshot: AccessSnapshot): AccessGate {
  if (!snapshot.ready) {
    return {
      kind: 'blocked',
      reason: 'loading',
    };
  }

  if (snapshot.mode === AccessMode.Byok) {
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

export function getAccessGateMessage(reason: AccessGateBlockedReason): string {
  switch (reason) {
    case 'loading':
      return 'Preparing your optimization access...';
    case 'missing-api-key':
      return 'Add your OpenAI API key before optimizing prompts.';
    case 'sign-in-required':
      return 'Sign in to Developer Assistant Pro before using hosted optimization.';
    case 'subscription-required':
      return 'Subscribe to Developer Assistant Pro or switch back to your own API key.';
    case 'subscription-loading':
      return 'Checking your Developer Assistant Pro subscription...';
    case 'offering-unavailable':
      return 'Developer Assistant Pro is unavailable right now. You can still use your own API key.';
  }
}

function toAccessIssue(reason: AccessGateBlockedReason): AccessIssue | null {
  switch (reason) {
    case 'loading':
    case 'subscription-loading':
      return null;
    case 'missing-api-key':
      return {
        code: 'missing-api-key',
        message: getAccessGateMessage(reason),
      };
    case 'sign-in-required':
      return {
        code: 'sign-in-required',
        message: getAccessGateMessage(reason),
      };
    case 'subscription-required':
      return {
        code: 'subscription-required',
        message: getAccessGateMessage(reason),
      };
    case 'offering-unavailable':
      return {
        code: 'offering-unavailable',
        message: getAccessGateMessage(reason),
      };
  }
}

export function getAccessPanelIssue(
  snapshot: AccessSnapshot,
): AccessIssue | null {
  if (snapshot.ui.accessIssue) {
    return snapshot.ui.accessIssue;
  }

  const accessGate = getAccessGate(snapshot);

  if (accessGate.kind === 'allowed') {
    return null;
  }

  return toAccessIssue(accessGate.reason);
}
