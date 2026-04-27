import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { Cache } from 'cache-manager';

import type { Config } from '../../types/config';
import { Service } from '../tokens';

export const ACCESS_CATALOG_FETCHER = Symbol('ACCESS_CATALOG_FETCHER');

type AccessCatalogProviderId =
  | 'openai'
  | 'claude'
  | 'deepseek'
  | 'gemini'
  | 'grok';

interface AccessCatalogModel {
  id: string;
  label: string;
}

interface AccessCatalogProvider {
  id: AccessCatalogProviderId;
  label: string;
  sourceUrl: string;
  defaultModelId: string;
  fetchedAt: string;
  models: AccessCatalogModel[];
}

interface SharedHostedOffering {
  enabled: boolean;
  label: 'Author Shared Key';
  plan: 'pro';
  priceAudMonthly: number;
}

export interface AccessCatalogResponse {
  cacheTtlSeconds: number;
  generatedAt: string;
  providers: AccessCatalogProvider[];
  sharedHostedOffering: SharedHostedOffering;
}

interface AccessCatalogCacheEnvelope {
  catalog: AccessCatalogResponse;
  expiresAt: number;
}

type CatalogFetcher = (url: string) => Promise<string>;

interface ProviderSourceDefinition {
  id: AccessCatalogProviderId;
  label: string;
  sourceUrl: string;
  parseModels: (content: string) => AccessCatalogModel[];
}

const accessCatalogCacheKey = 'access-catalog:v1';
const staleRetentionMultiplier = 7;

const providerDefinitions: ProviderSourceDefinition[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    sourceUrl: 'https://platform.openai.com/docs/models',
    parseModels: parseOpenAiModels,
  },
  {
    id: 'claude',
    label: 'Claude',
    sourceUrl: 'https://docs.anthropic.com/en/docs/about-claude/models/overview',
    parseModels: parseClaudeModels,
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    sourceUrl: 'https://api-docs.deepseek.com/',
    parseModels: parseDeepSeekModels,
  },
  {
    id: 'gemini',
    label: 'Gemini',
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/models/gemini',
    parseModels: parseGeminiModels,
  },
  {
    id: 'grok',
    label: 'Grok',
    sourceUrl: 'https://docs.x.ai/docs/models?cluster=us-west-1',
    parseModels: parseGrokModels,
  },
];

function uniqueById(models: AccessCatalogModel[]) {
  const seen = new Set<string>();

  return models.filter((model) => {
    if (seen.has(model.id)) {
      return false;
    }

    seen.add(model.id);
    return true;
  });
}

function toStableOpenAiId(rawMatch: string) {
  return rawMatch
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function toOpenAiLabel(id: string) {
  return id
    .split('-')
    .map((part, index) => {
      if (index === 0) {
        return part.toUpperCase();
      }

      if (part === 'mini' || part === 'nano' || part === 'pro') {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }

      return part.toUpperCase();
    })
    .join(' ');
}

function parseOpenAiModels(content: string): AccessCatalogModel[] {
  const matches = content.match(/GPT-\d+(?:\.\d+)?(?:\s+(?:mini|nano|pro))?/g) ?? [];

  return uniqueById(
    matches.map((match) => {
      const id = toStableOpenAiId(match);

      return {
        id,
        label: toOpenAiLabel(id),
      };
    }),
  );
}

function parseClaudeModels(content: string): AccessCatalogModel[] {
  const matches =
    content.match(/claude-(?:opus|sonnet|haiku)-[a-z0-9.-]+/gi) ?? [];

  return uniqueById(
    matches
      .filter((match) => !match.endsWith('-latest'))
      .map((match) => {
        const id = match.toLowerCase();

        return {
          id,
          label: id
            .replace(/^claude-/, 'Claude ')
            .replace(/-/g, ' ')
            .replace(/\b(\d{8})\b$/, '')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, (char) => char.toUpperCase()),
        };
      }),
  );
}

function parseDeepSeekModels(content: string): AccessCatalogModel[] {
  const matches =
    content.match(/deepseek-(?:v[\d.]+-(?:flash|pro)|chat|reasoner)/gi) ?? [];

  return uniqueById(
    matches.map((match) => {
      const id = match.toLowerCase();

      return {
        id,
        label: id
          .replace(/^deepseek-/, 'DeepSeek ')
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase()),
      };
    }),
  );
}

function parseGeminiModels(content: string): AccessCatalogModel[] {
  const matches = content.match(/gemini-[a-z0-9.-]+/gi) ?? [];

  return uniqueById(
    matches
      .filter((match) => {
        const normalized = match.toLowerCase();

        return (
          !normalized.includes('preview') &&
          !normalized.includes('exp') &&
          !normalized.includes('live') &&
          !normalized.includes('audio') &&
          !normalized.includes('image') &&
          !normalized.includes('tts') &&
          /^gemini-(?:\d+(?:\.\d+)?)-(?:pro|flash|flash-lite)$/.test(
            normalized,
          )
        );
      })
      .map((match) => {
        const id = match.toLowerCase();

        return {
          id,
          label: id
            .replace(/^gemini-/, 'Gemini ')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase()),
        };
      }),
  );
}

function parseGrokModels(content: string): AccessCatalogModel[] {
  const matches = content.match(/grok-[a-z0-9.-]+/gi) ?? [];

  return uniqueById(
    matches
      .filter((match) => {
        const normalized = match.toLowerCase();

        return (
          !normalized.includes('preview') &&
          !normalized.includes('image') &&
          !normalized.includes('audio') &&
          !normalized.includes('voice') &&
          !normalized.includes('code') &&
          normalized !== 'grok'
        );
      })
      .map((match) => {
        const id = match.toLowerCase();

        return {
          id,
          label: id
            .replace(/^grok-/, 'Grok ')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase()),
        };
      }),
  );
}

@Injectable()
export class AccessCatalogService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(Service.CONFIG) private readonly config: Config,
    @Inject(ACCESS_CATALOG_FETCHER)
    private readonly fetchCatalogSource: CatalogFetcher,
  ) {}

  async getCatalog() {
    const cached = await this.getCachedCatalog();

    if (cached && Date.now() < cached.expiresAt) {
      return cached.catalog;
    }

    try {
      const catalog = await this.buildCatalog();
      await this.setCachedCatalog(catalog);
      return catalog;
    } catch (error) {
      if (cached) {
        return cached.catalog;
      }

      throw new ServiceUnavailableException(
        'Unable to load access catalog right now.',
        {
          cause: error,
        },
      );
    }
  }

  private async getCachedCatalog() {
    return (
      (await this.cacheManager.get<AccessCatalogCacheEnvelope>(
        accessCatalogCacheKey,
      )) ?? null
    );
  }

  private async setCachedCatalog(catalog: AccessCatalogResponse) {
    const ttlSeconds = this.config.ACCESS_CATALOG_CACHE_TTL_SECONDS;
    const staleRetentionSeconds = Math.max(
      ttlSeconds * staleRetentionMultiplier,
      86_400,
    );

    await this.cacheManager.set(
      accessCatalogCacheKey,
      {
        catalog,
        expiresAt: Date.now() + ttlSeconds * 1000,
      } satisfies AccessCatalogCacheEnvelope,
      staleRetentionSeconds * 1000,
    );
  }

  private async buildCatalog(): Promise<AccessCatalogResponse> {
    const fetchedAt = new Date().toISOString();
    const providers = await Promise.all(
      providerDefinitions.map(async (provider) => {
        const content = await this.fetchCatalogSource(provider.sourceUrl);
        const models = provider.parseModels(content);

        if (models.length === 0) {
          throw new Error(`No stable models found for provider ${provider.id}.`);
        }

        return {
          defaultModelId: models[0].id,
          fetchedAt,
          id: provider.id,
          label: provider.label,
          models,
          sourceUrl: provider.sourceUrl,
        } satisfies AccessCatalogProvider;
      }),
    );

    return {
      cacheTtlSeconds: this.config.ACCESS_CATALOG_CACHE_TTL_SECONDS,
      generatedAt: fetchedAt,
      providers,
      sharedHostedOffering: {
        enabled:
          Boolean(this.config.DEEPSEEK_API_KEY) &&
          Boolean(this.config.STRIPE_SECRET_KEY) &&
          Boolean(this.config.STRIPE_PRO_MONTHLY_PRICE_ID),
        label: 'Author Shared Key',
        plan: 'pro',
        priceAudMonthly: this.config.PROMPT_OPTIMIZER_PRO_PRICE_AUD_MONTHLY,
      },
    };
  }
}

export const accessCatalogFetcherProvider = {
  provide: ACCESS_CATALOG_FETCHER,
  useValue: (async (url: string) => {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Unable to fetch access catalog source: ${url}`);
    }

    return await response.text();
  }) satisfies CatalogFetcher,
};
