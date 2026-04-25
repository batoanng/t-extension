import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

import type { CacheDemoRequest } from './cache.schemas';

@Injectable()
export class CacheDemoService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async setValue(request: CacheDemoRequest) {
    const ttlMs = request.ttlMs ?? 60_000;

    await this.cacheManager.set(request.key, request.value, ttlMs);

    return {
      key: request.key,
      value: request.value,
      ttlMs,
    };
  }

  async getValue(key: string) {
    return {
      key,
      value: (await this.cacheManager.get<string>(key)) ?? null,
    };
  }
}
