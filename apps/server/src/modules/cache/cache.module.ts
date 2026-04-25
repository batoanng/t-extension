import { Module } from '@nestjs/common';

import { CacheController } from './cache.controller';
import { CacheDemoService } from './cache.service';

@Module({
  controllers: [CacheController],
  providers: [CacheDemoService],
  exports: [CacheDemoService],
})
export class CacheFeatureModule {}
