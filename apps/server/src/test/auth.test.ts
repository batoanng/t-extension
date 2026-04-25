import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('generated auth routes', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.VERCEL = '1';
    process.env.API_PORT = '3001';
    process.env.API_VERSION = '1';
    process.env.SWAGGER_ENABLE = '0';
    process.env.DATABASE_URL = 'mongodb://localhost:27017/nest';
    process.env.HEALTH_TOKEN = 'replace-me';
    process.env.ACCESS_SECRET = 'access-secret';
    process.env.REFRESH_SECRET = 'refresh-secret';
    process.env.ACCESS_EXPIRES_IN = '15m';
    process.env.REFRESH_EXPIRES_IN = '7d';

    const { createApp } = await import('../server');
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
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
