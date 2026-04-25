import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import {
  CacheDemoKeySchema,
  CacheDemoRequestSchema,
} from './cache.schemas';
import { CacheDemoService } from './cache.service';

@Controller('cache')
export class CacheController {
  constructor(private readonly cacheDemo: CacheDemoService) {}

  @Post('demo')
  async setDemoValue(@Body() body: unknown) {
    const request = CacheDemoRequestSchema.parse(body);

    return this.cacheDemo.setValue(request);
  }

  @Get('demo/:key')
  async getDemoValue(@Param('key') key: string) {
    const parsedKey = CacheDemoKeySchema.parse(key);

    return this.cacheDemo.getValue(parsedKey);
  }
}
