import { z } from 'zod';

export enum AccessMode {
  Byok = 'byok',
  Pro = 'pro',
}

export enum MagicLinkStatus {
  Pending = 'pending',
  Completed = 'completed',
  Expired = 'expired',
}

export const byokProviders = ['openrouter'] as const;

export type ByokProvider = (typeof byokProviders)[number];

export const DEFAULT_BYOK_PROVIDER: ByokProvider = 'openrouter';

const byokProviderLabels: Record<ByokProvider, string> = {
  openrouter: 'OpenRouter',
};

export const AccessCatalogModelSchema = z.object({
  id: z.string().trim().min(1),
  label: z.string().trim().min(1),
});

export const AccessCatalogProviderSchema = z.object({
  id: z.enum(byokProviders),
  label: z.string().trim().min(1),
  defaultModelId: z.string().trim().min(1),
  models: z.array(AccessCatalogModelSchema).min(1),
});

export const AccessCatalogResponseSchema = z.object({
  cacheTtlSeconds: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  providers: z.array(AccessCatalogProviderSchema).min(1),
  sharedHostedOffering: z.object({
    enabled: z.boolean(),
    label: z.literal('Author Shared Key'),
    plan: z.literal('pro'),
    priceAudMonthly: z.number().positive(),
  }),
});

export type AccessCatalogModel = z.infer<typeof AccessCatalogModelSchema>;
export type AccessCatalogProviderEntry = z.infer<
  typeof AccessCatalogProviderSchema
>;
export type AccessCatalogResponse = z.infer<typeof AccessCatalogResponseSchema>;

export type AccessIssueCode =
  | 'catalog-unavailable'
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
  provider: ByokProvider;
  selectedModel: string;
}

export interface SubscriptionStatus {
  plan: 'free' | 'pro';
  promptOptimization: {
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    enabled: boolean;
    provider: 'byok' | 'openrouter';
    status: string;
  };
  user: {
    email: string;
    id: string;
  };
}

export type GenerationAccess =
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
  catalog: {
    data: AccessCatalogResponse | null;
    errorMessage: string | null;
    status: 'idle' | 'loading' | 'ready' | 'error';
  };
  mode: AccessMode;
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
  ui: {
    accessIssue: AccessIssue | null;
  };
}

export type AccessGateBlockedReason =
  | 'catalog-loading'
  | 'catalog-unavailable'
  | 'loading'
  | 'missing-api-key'
  | 'missing-model-config'
  | 'sign-in-required'
  | 'subscription-required'
  | 'subscription-loading'
  | 'offering-unavailable';

export type AccessGate =
  | {
      access: GenerationAccess;
      kind: 'allowed';
    }
  | {
      kind: 'blocked';
      reason: AccessGateBlockedReason;
    };

export function getByokProviderLabel(provider: ByokProvider): string {
  return byokProviderLabels[provider];
}

export function getAccessCatalogProvider(
  catalog: AccessCatalogResponse | null,
  provider: ByokProvider,
): AccessCatalogProviderEntry | null {
  return catalog?.providers.find((entry) => entry.id === provider) ?? null;
}

export function getAccessCatalogProviderOptions(
  catalog: AccessCatalogResponse | null,
): Array<{
  label: string;
  value: ByokProvider;
}> {
  return (
    catalog?.providers.map((provider) => ({
      label: provider.label,
      value: provider.id,
    })) ??
    byokProviders.map((provider) => ({
      label: getByokProviderLabel(provider),
      value: provider,
    }))
  );
}

export function getAccessCatalogModelOptions(
  catalog: AccessCatalogResponse | null,
  provider: ByokProvider,
): AccessCatalogModel[] {
  return getAccessCatalogProvider(catalog, provider)?.models ?? [];
}

export function getDefaultByokModel(
  catalog: AccessCatalogResponse | null,
  provider: ByokProvider,
): string {
  const providerEntry = getAccessCatalogProvider(catalog, provider);

  return providerEntry?.defaultModelId ?? providerEntry?.models[0]?.id ?? '';
}

export function resolveByokModel(input: { selectedModel: string }): string {
  return input.selectedModel.trim();
}

export function getProviderApiKeyHint(provider: ByokProvider): string {
  switch (provider) {
    case 'openrouter':
      return 'Use an OpenRouter API key. Requests use the configured OpenRouter model.';
  }
}

export function createDefaultByokConfig(
  catalog: AccessCatalogResponse | null = null,
): StoredByokConfig {
  return {
    apiKey: null,
    provider: DEFAULT_BYOK_PROVIDER,
    selectedModel: getDefaultByokModel(catalog, DEFAULT_BYOK_PROVIDER),
  };
}

export function reconcileByokConfig(
  catalog: AccessCatalogResponse | null,
  config: Partial<StoredByokConfig> | null | undefined,
): StoredByokConfig {
  const providerIds = catalog?.providers.map((provider) => provider.id) ?? [];
  const fallbackProvider = providerIds[0] ?? DEFAULT_BYOK_PROVIDER;
  const provider =
    config?.provider &&
    typeof config.provider === 'string' &&
    byokProviders.includes(config.provider as ByokProvider) &&
    (providerIds.length === 0 ||
      providerIds.includes(config.provider as ByokProvider))
      ? (config.provider as ByokProvider)
      : fallbackProvider;

  const defaultModel = getDefaultByokModel(catalog, provider);
  const requestedModel =
    typeof config?.selectedModel === 'string'
      ? config.selectedModel.trim()
      : '';
  const providerModels = getAccessCatalogModelOptions(catalog, provider);
  const selectedModel =
    requestedModel.length > 0 &&
    (!catalog || providerModels.some((model) => model.id === requestedModel))
      ? requestedModel
      : defaultModel;

  return {
    apiKey:
      typeof config?.apiKey === 'string' && config.apiKey.trim().length > 0
        ? config.apiKey.trim()
        : null,
    provider,
    selectedModel,
  };
}

export function getAccessGate(snapshot: AccessSnapshot): AccessGate {
  if (!snapshot.ready) {
    return {
      kind: 'blocked',
      reason: 'loading',
    };
  }

  if (!snapshot.catalog.data && snapshot.catalog.status === 'loading') {
    return {
      kind: 'blocked',
      reason: 'catalog-loading',
    };
  }

  if (!snapshot.catalog.data && snapshot.catalog.status === 'error') {
    return {
      kind: 'blocked',
      reason: 'catalog-unavailable',
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
        reason: snapshot.catalog.data
          ? 'missing-model-config'
          : 'catalog-unavailable',
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
    snapshot.catalog.status === 'ready' &&
    snapshot.catalog.data &&
    !snapshot.catalog.data.sharedHostedOffering.enabled
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
      return 'Preparing your generation access...';
    case 'catalog-loading':
      return 'Loading the latest provider catalog...';
    case 'catalog-unavailable':
      return 'The provider catalog is unavailable right now. Try again when you are back online.';
    case 'missing-api-key':
      return 'Add your API key before generating briefs.';
    case 'missing-model-config':
      return 'Choose a model before generating briefs.';
    case 'sign-in-required':
      return 'Sign in before using shared hosted generation.';
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
    case 'catalog-loading':
      return null;
    case 'catalog-unavailable':
      return {
        code: 'catalog-unavailable',
        message: getAccessGateMessage(reason),
      };
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
