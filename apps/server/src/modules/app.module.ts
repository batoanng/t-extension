import { Module } from '@nestjs/common';
import { createKeyv } from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common';
import { CacheFeatureModule } from './cache';
import { LlmFeatureModule } from './llm';
import { config } from '../types/config';

function toRedisUrl(): string {
  const username = config.REDIS_USERNAME;
  const password = config.REDIS_PASSWORD;
  const auth = username && password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';

  return `redis://${auth}${config.REDIS_HOST}:${config.REDIS_PORT}`;
}

@Module({
  imports: [
    CommonModule,
    AuthModule,
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        const keyv = createKeyv(toRedisUrl());

        return {
          stores: [keyv],
        };
      },
    }),
    CacheFeatureModule,
    LlmFeatureModule,
  ],
})
export class ApplicationModule {}
