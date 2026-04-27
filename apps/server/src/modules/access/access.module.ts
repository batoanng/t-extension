import { Module } from '@nestjs/common';

import { CommonModule } from '../common';
import { AccessCatalogController } from './access.controller';
import { AccessCatalogService } from './access.service';

@Module({
  imports: [CommonModule],
  controllers: [AccessCatalogController],
  providers: [AccessCatalogService],
  exports: [AccessCatalogService],
})
export class AccessCatalogModule {}
