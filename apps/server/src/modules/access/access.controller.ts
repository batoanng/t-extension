import { Controller, Get, HttpCode, Inject } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { AccessCatalogService } from './access.service';

@Controller('access')
@ApiTags('access')
export class AccessCatalogController {
  constructor(
    @Inject(AccessCatalogService)
    private readonly accessCatalogService: AccessCatalogService,
  ) {}

  @Get('catalog')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Return the public optimize-access catalog with providers, models, price, and cache metadata',
  })
  getCatalog() {
    return this.accessCatalogService.getCatalog();
  }
}
