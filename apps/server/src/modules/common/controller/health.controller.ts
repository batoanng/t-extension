import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';

import { PrismaService } from '../provider';
import { HealthGuard } from '../security';

@Controller('health')
@ApiTags('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @UseGuards(HealthGuard)
  @ApiOperation({
    summary: 'Health check',
    description:
      'Returns Prisma connectivity and process uptime for monitoring.',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
      },
    },
  })
  @ApiForbiddenResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Forbidden resource' },
      },
    },
  })
  async healthCheck() {
    return this.health.check([
      async () => this.database.pingCheck('database', this.prisma),
      () => ({
        http: {
          status: 'up',
          uptime: process.uptime(),
        },
      }),
    ]);
  }
}
