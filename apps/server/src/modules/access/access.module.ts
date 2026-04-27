import { Module } from '@nestjs/common';

import { CommonModule } from '../common';
import { AccessCatalogController } from './access.controller';
import {
  AccessCatalogService,
  accessCatalogFetcherProvider,
} from './access.service';

@Module({
  imports: [CommonModule],
  controllers: [AccessCatalogController],
  providers: [AccessCatalogService, accessCatalogFetcherProvider],
  exports: [AccessCatalogService],
})
export class AccessCatalogModule {}
