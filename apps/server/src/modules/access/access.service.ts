import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

import type { Config } from '../../types/config';
import { Service } from '../tokens';
import { type AiModelProviderId, aiModelProviders } from './ai-models';

interface AccessCatalogModel {
  id: string;
  label: string;
}

interface AccessCatalogProvider {
  id: AiModelProviderId;
  label: string;
  defaultModelId: string;
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

const accessCatalogCacheKey = 'access-catalog:v2';
const staleRetentionMultiplier = 7;

@Injectable()
export class AccessCatalogService {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(Service.CONFIG) private readonly config: Config,
  ) {}

  async getCatalog() {
    const cached = await this.getCachedCatalog();

    if (cached && Date.now() < cached.expiresAt) {
      return cached.catalog;
    }

    const catalog = this.buildCatalog();
    await this.setCachedCatalog(catalog);
    return catalog;
  }

  private async getCachedCatalog() {
    return (await this.cacheManager.get<AccessCatalogCacheEnvelope>(accessCatalogCacheKey)) ?? null;
  }

  private async setCachedCatalog(catalog: AccessCatalogResponse) {
    const ttlSeconds = this.config.ACCESS_CATALOG_CACHE_TTL_SECONDS;
    const staleRetentionSeconds = Math.max(ttlSeconds * staleRetentionMultiplier, 86_400);

    await this.cacheManager.set(
      accessCatalogCacheKey,
      {
        catalog,
        expiresAt: Date.now() + ttlSeconds * 1000,
      } satisfies AccessCatalogCacheEnvelope,
      staleRetentionSeconds * 1000,
    );
  }

  private buildCatalog(): AccessCatalogResponse {
    const generatedAt = new Date().toISOString();
    const providers = aiModelProviders.map(
      (provider) =>
        ({
          defaultModelId: provider.models[0].id,
          id: provider.id,
          label: provider.label,
          models: provider.models.map((model) => ({ ...model })),
        }) satisfies AccessCatalogProvider,
    );

    return {
      cacheTtlSeconds: this.config.ACCESS_CATALOG_CACHE_TTL_SECONDS,
      generatedAt,
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
