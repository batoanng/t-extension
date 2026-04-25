import { Controller, Get, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('nest'),
});

@Controller('health')
class TestHealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'nest',
    };
  }
}

@Module({
  controllers: [TestHealthController],
})
class TestHealthModule {}

describe('generated Vitest setup', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestHealthModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the sample health route through Fastify injection', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(JSON.parse(response.payload))).toEqual({
      status: 'ok',
      service: 'nest',
    });
  });
});
