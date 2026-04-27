export enum AccessMode {
  Byok = 'byok',
  Pro = 'pro',
}

export enum MagicLinkStatus {
  Pending = 'pending',
  Completed = 'completed',
  Expired = 'expired',
}

export const byokProviders = [
  'openai',
  'claude',
  'deepseek',
  'gemini',
  'grok',
] as const;

export type ByokProvider = (typeof byokProviders)[number];

export const DEFAULT_BYOK_PROVIDER: ByokProvider = 'openai';
export const CUSTOM_MODEL_OPTION_VALUE = '__custom_model__';

export interface ByokModelOption {
  label: string;
  value: string;
}

const byokProviderLabels: Record<ByokProvider, string> = {
  claude: 'Claude',
  deepseek: 'DeepSeek',
  gemini: 'Gemini',
  grok: 'Grok',
  openai: 'OpenAI',
};

const byokProviderModelOptions: Record<ByokProvider, ByokModelOption[]> = {
  claude: [
    { label: 'Claude Sonnet 4', value: 'claude-sonnet-4-20250514' },
    { label: 'Claude 3.7 Sonnet', value: 'claude-3-7-sonnet-latest' },
  ],
  deepseek: [
    { label: 'DeepSeek V4 Flash', value: 'deepseek-v4-flash' },
    { label: 'DeepSeek V4 Pro', value: 'deepseek-v4-pro' },
  ],
  gemini: [
    { label: 'Gemini 2.5 Flash', value: 'gemini-2.5-flash' },
    { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro' },
  ],
  grok: [
    { label: 'Grok 4.20 Reasoning', value: 'grok-4.20-reasoning' },
    { label: 'Grok 3', value: 'grok-3' },
  ],
  openai: [
    { label: 'GPT-4.1 Mini', value: 'gpt-4.1-mini' },
    { label: 'GPT-4.1', value: 'gpt-4.1' },
  ],
};

export type AccessIssueCode =
  | 'invalid-api-key'
  | 'missing-api-key'
  | 'missing-model'
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

export interface StoredByokConfig {
  apiKey: string | null;
  customModel: string;
  provider: ByokProvider;
  selectedModel: string;
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
      model: string;
      provider: ByokProvider;
    };

export interface AccessSnapshot {
  byok: StoredByokConfig;
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
  | 'missing-model-config'
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

export function getByokProviderLabel(provider: ByokProvider): string {
  return byokProviderLabels[provider];
}

export function getByokProviderOptions(): Array<{
  label: string;
  value: ByokProvider;
}> {
  return byokProviders.map((provider) => ({
    label: getByokProviderLabel(provider),
    value: provider,
  }));
}

export function getByokModelOptions(provider: ByokProvider): ByokModelOption[] {
  return [
    ...byokProviderModelOptions[provider],
    {
      label: 'Custom model...',
      value: CUSTOM_MODEL_OPTION_VALUE,
    },
  ];
}

export function getDefaultByokModel(provider: ByokProvider): string {
  return byokProviderModelOptions[provider][0]?.value ?? '';
}

export function resolveByokModel(input: {
  customModel: string;
  selectedModel: string;
}): string {
  if (input.selectedModel === CUSTOM_MODEL_OPTION_VALUE) {
    return input.customModel.trim();
  }

  return input.selectedModel.trim();
}

export function getProviderApiKeyHint(provider: ByokProvider): string {
  switch (provider) {
    case 'openai':
      return 'Use an OpenAI API key for the selected OpenAI model.';
    case 'claude':
      return 'Use an Anthropic API key for the selected Claude model.';
    case 'deepseek':
      return 'Use a DeepSeek API key for the selected DeepSeek model.';
    case 'gemini':
      return 'Use a Gemini API key for the selected Gemini model.';
    case 'grok':
      return 'Use an xAI API key for the selected Grok model.';
  }
}

export function createDefaultByokConfig(): StoredByokConfig {
  return {
    apiKey: null,
    customModel: '',
    provider: DEFAULT_BYOK_PROVIDER,
    selectedModel: getDefaultByokModel(DEFAULT_BYOK_PROVIDER),
  };
}

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

    const model = resolveByokModel(snapshot.byok);

    if (!model) {
      return {
        kind: 'blocked',
        reason: 'missing-model-config',
      };
    }

    return {
      kind: 'allowed',
      access: {
        apiKey: snapshot.byok.apiKey,
        kind: 'byok',
        model,
        provider: snapshot.byok.provider,
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
      return 'Add your API key before optimizing prompts.';
    case 'missing-model-config':
      return 'Choose a model before optimizing prompts.';
    case 'sign-in-required':
      return 'Sign in before using shared hosted optimization.';
    case 'subscription-required':
      return 'Subscribe for shared hosted access or switch back to your own API key.';
    case 'subscription-loading':
      return 'Checking your shared hosted access subscription...';
    case 'offering-unavailable':
      return 'Shared hosted access is unavailable right now. You can still use your own API key.';
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
    case 'missing-model-config':
      return {
        code: 'missing-model',
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
