import { Module } from '@nestjs/common';
import KeyvRedis from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common';
import { CacheFeatureModule } from './cache';
import { PromptFeatureModule } from './prompt';
import { SubscriptionModule } from './subscription';
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
      useFactory: () => {
        return {
          stores: [new KeyvRedis(toRedisUrl())],
        };
      },
    }),
    CacheFeatureModule,
    PromptFeatureModule,
    SubscriptionModule,
  ],
})
export class ApplicationModule {}
