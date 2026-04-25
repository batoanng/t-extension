import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthController } from '../modules/auth/auth.controller';
import { AuthService } from '../modules/auth/auth.service';
import { AccessTokenGuard } from '../modules/auth/guards/access-token.guard';
import { JwtStrategy } from '../modules/auth/jwt.strategy';
import { MagicLinkMailerService } from '../modules/auth/magic-link-mailer.service';
import { PrismaService } from '../modules/common/provider';
import { Service } from '../modules/tokens';
import type { Config } from '../types/config';

const authTestConfig: Config = Object.freeze({
  ACCESS_EXPIRES_IN: '15m',
  ACCESS_EXPIRES_IN_SECONDS: 900,
  ACCESS_SECRET: 'access-secret',
  API_PORT: 3000,
  API_VERSION: 1,
  CORS_ORIGIN: ['http://localhost:3001'],
  DATABASE_URL: 'mongodb://localhost:27017/nest',
  DEEPSEEK_API_KEY: 'deepseek-test',
  DEEPSEEK_BASE_URL: 'https://api.deepseek.com/v1',
  DEEPSEEK_MODEL: 'deepseek-chat',
  EMAIL_FROM: 'noreply@example.com',
  HEALTH_TOKEN: 'replace-me',
  OPENAI_API_KEY: undefined,
  OPENAI_MODEL: 'gpt-4o-mini',
  PROMPT_OPTIMIZER_PRO_PRICE_AUD_MONTHLY: 5,
  REDIS_HOST: 'localhost',
  REDIS_PASSWORD: undefined,
  REDIS_PORT: 6379,
  REDIS_USERNAME: undefined,
  REFRESH_EXPIRES_IN: '7d',
  REFRESH_EXPIRES_IN_SECONDS: 604800,
  REFRESH_SECRET: 'refresh-secret',
  RESEND_API_KEY: undefined,
  STRIPE_CANCEL_URL: 'https://example.com/cancel',
  STRIPE_PRO_MONTHLY_PRICE_ID: undefined,
  STRIPE_SECRET_KEY: undefined,
  STRIPE_SUCCESS_URL: 'https://example.com/success',
  STRIPE_WEBHOOK_SECRET: undefined,
  SWAGGER_ENABLE: false,
});

function createPrismaMock() {
  let magicLinkId = 0;
  let userId = 0;
  const magicLinks = new Map<string, any>();
  const users = new Map<string, any>();

  return {
    magicLinkToken: {
      async create({ data }: { data: Record<string, unknown> }) {
        magicLinkId += 1;
        const record = {
          id: `magic_${magicLinkId}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        magicLinks.set(record.id as string, record);
        return record;
      },
      async findUnique({ where }: { where: Record<string, unknown> }) {
        for (const record of magicLinks.values()) {
          if (
            ('authRequestId' in where &&
              record.authRequestId === where.authRequestId) ||
            ('tokenHash' in where && record.tokenHash === where.tokenHash) ||
            ('id' in where && record.id === where.id)
          ) {
            return record;
          }
        }

        return null;
      },
      async update({
        data,
        where,
      }: {
        data: Record<string, unknown>;
        where: Record<string, unknown>;
      }) {
        const existing = await this.findUnique({ where });

        if (!existing) {
          throw new Error('Magic link not found');
        }

        const updated = {
          ...(existing as Record<string, unknown>),
          ...data,
          updatedAt: new Date(),
        } as unknown as Record<string, unknown> & { id: string };

        magicLinks.set(updated.id as string, updated);
        return updated;
      },
    },
    user: {
      async findUnique({ where }: { where: Record<string, unknown> }) {
        for (const record of users.values()) {
          if (
            ('id' in where && record.id === where.id) ||
            ('email' in where && record.email === where.email)
          ) {
            return record;
          }
        }

        return null;
      },
      async upsert({
        create,
        where,
      }: {
        create: Record<string, unknown>;
        update: Record<string, unknown>;
        where: Record<string, unknown>;
      }) {
        const existing = await this.findUnique({ where });

        if (existing) {
          return existing;
        }

        userId += 1;
        const record = {
          id: `user_${userId}`,
          ...create,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        users.set(record.id as string, record);
        return record;
      },
    },
  };
}

const prismaMock = createPrismaMock();
const sendMagicLinkMock = vi.fn(
  async (_input: { email: string; verifyUrl: string }) => undefined,
);

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
      provide: MagicLinkMailerService,
      useValue: {
        sendMagicLink: sendMagicLinkMock,
      },
    },
    {
      provide: PrismaService,
      useValue: prismaMock,
    },
    {
      provide: Service.CONFIG,
      useValue: authTestConfig,
    },
  ],
})
class TestAuthModule {}

describe('auth routes', () => {
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

  beforeEach(() => {
    sendMagicLinkMock.mockReset();
  });

  it('supports magic-link login, me, refresh, and logout', async () => {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'demo@example.com',
      },
      headers: {
        host: 'localhost:3000',
      },
    });
    const loginPayload = JSON.parse(loginResponse.payload) as {
      authRequestId: string;
      expiresInSeconds: number;
    };

    expect(loginResponse.statusCode).toBe(200);
    expect(loginPayload.expiresInSeconds).toBe(900);
    expect(sendMagicLinkMock).toHaveBeenCalledTimes(1);

    const sentEmail = sendMagicLinkMock.mock.calls[0]?.[0] as
      | {
          verifyUrl: string;
        }
      | undefined;

    expect(sentEmail?.verifyUrl).toBeTruthy();

    const verifyUrl = new URL(sentEmail!.verifyUrl);
    const token = verifyUrl.searchParams.get('token');

    expect(token).toBeTruthy();

    const verifyResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/auth/verify-magic-link?token=${token}`,
    });

    expect(verifyResponse.statusCode).toBe(200);

    const statusResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/auth/magic-link-status?requestId=${loginPayload.authRequestId}`,
    });
    const statusPayload = JSON.parse(statusResponse.payload);

    expect(statusResponse.statusCode).toBe(200);
    expect(statusPayload.status).toBe('completed');
    expect(statusPayload.auth.tokenType).toBe('Bearer');

    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${statusPayload.auth.accessToken}`,
      },
    });

    expect(meResponse.statusCode).toBe(200);
    expect(JSON.parse(meResponse.payload)).toEqual({
      email: statusPayload.auth.user.email,
      id: statusPayload.auth.user.id,
    });

    const refreshResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {
        refreshToken: statusPayload.auth.refreshToken,
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
