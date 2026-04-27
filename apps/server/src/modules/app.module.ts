import { createKeyv } from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';

import { config } from '../types/config';
import { AccessCatalogModule } from './access';
import { AuthModule } from './auth/auth.module';
import { CacheFeatureModule } from './cache';
import { CommonModule } from './common';
import { PromptFeatureModule } from './prompt';
import { SubscriptionModule } from './subscription';

function toRedisUrl(): string {
  const username = config.REDIS_USERNAME;
  const password = config.REDIS_PASSWORD;
  const auth =
    username && password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
  const scheme = config.REDIS_TLS ? 'rediss' : 'redis';

  return `${scheme}://${auth}${config.REDIS_HOST}:${config.REDIS_PORT}`;
}

@Module({
  imports: [
    CommonModule,
    AuthModule,
    AccessCatalogModule,
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: () => {
        return {
          stores: [createKeyv(toRedisUrl())],
        };
      },
    }),
    CacheFeatureModule,
    PromptFeatureModule,
    SubscriptionModule,
  ],
})
export class ApplicationModule {}
