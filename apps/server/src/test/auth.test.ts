import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Service } from '../modules/tokens';
import { AuthController } from '../modules/auth/auth.controller';
import { AuthService } from '../modules/auth/auth.service';
import { AccessTokenGuard } from '../modules/auth/guards/access-token.guard';
import { JwtStrategy } from '../modules/auth/jwt.strategy';
import type { Config } from '../types/config';

const authTestConfig: Config = Object.freeze({
  ACCESS_EXPIRES_IN: '15m',
  ACCESS_EXPIRES_IN_SECONDS: 900,
  ACCESS_SECRET: 'access-secret',
  API_PORT: 3000,
  API_VERSION: 1,
  CORS_ORIGIN: ['http://localhost:3001'],
  DATABASE_URL: 'mongodb://localhost:27017/nest',
  HEALTH_TOKEN: 'replace-me',
  OPENAI_API_KEY: undefined,
  OPENAI_MODEL: 'gpt-4o-mini',
  REDIS_HOST: 'localhost',
  REDIS_PASSWORD: undefined,
  REDIS_PORT: 6379,
  REDIS_USERNAME: undefined,
  REFRESH_EXPIRES_IN: '7d',
  REFRESH_EXPIRES_IN_SECONDS: 604800,
  REFRESH_SECRET: 'refresh-secret',
  SWAGGER_ENABLE: false,
});

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: authTestConfig.ACCESS_SECRET,
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenGuard,
    JwtStrategy,
    {
      provide: Service.CONFIG,
      useValue: authTestConfig,
    },
  ],
})
class TestAuthModule {}

describe('generated auth routes', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestAuthModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setGlobalPrefix('api/v1');

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('supports login, me, refresh, and logout', async () => {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'demo@example.com',
        password: 'password123',
      },
    });
    const loginPayload = JSON.parse(loginResponse.payload);

    expect(loginResponse.statusCode).toBe(200);
    expect(loginPayload.tokenType).toBe('Bearer');
    expect(loginPayload.accessTokenExpiresIn).toBe(900);
    expect(loginPayload.refreshTokenExpiresIn).toBe(604800);

    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${loginPayload.accessToken}`,
      },
    });

    expect(meResponse.statusCode).toBe(200);
    expect(JSON.parse(meResponse.payload)).toEqual(loginPayload.user);

    const rejectedRefreshToken = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${loginPayload.refreshToken}`,
      },
    });

    expect(rejectedRefreshToken.statusCode).toBe(401);

    const refreshResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {
        refreshToken: loginPayload.refreshToken,
      },
    });
    const refreshPayload = JSON.parse(refreshResponse.payload);

    expect(refreshResponse.statusCode).toBe(200);
    expect(refreshPayload.tokenType).toBe('Bearer');

    const logoutResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: {
        refreshToken: refreshPayload.refreshToken,
      },
    });

    expect(logoutResponse.statusCode).toBe(200);
    expect(JSON.parse(logoutResponse.payload)).toEqual({ success: true });
  });
});
