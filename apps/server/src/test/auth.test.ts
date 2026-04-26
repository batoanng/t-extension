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
import type {
  AuthResponse,
  MagicLinkStatusResponse,
} from '../modules/auth/types/auth.types';
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

interface MagicLinkRecord {
  id: string;
  authRequestId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt?: Date;
  verifiedAt?: Date;
  exchangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface UserRecord {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface LoginResponse {
  authRequestId: string;
  expiresInSeconds: number;
}

interface LogoutResponse {
  success: true;
}

interface MagicLinkEmail {
  email: string;
  verifyUrl: string;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readOptionalDate(value: unknown): Date | undefined {
  return value instanceof Date ? value : undefined;
}

function createPrismaMock() {
  let magicLinkId = 0;
  let userId = 0;
  const magicLinks = new Map<string, MagicLinkRecord>();
  const users = new Map<string, UserRecord>();

  return {
    magicLinkToken: {
      create({ data }: { data: Record<string, unknown> }) {
        magicLinkId += 1;
        const record: MagicLinkRecord = {
          id: `magic_${magicLinkId}`,
          authRequestId: String(data.authRequestId),
          email: String(data.email),
          tokenHash: String(data.tokenHash),
          expiresAt: data.expiresAt as Date,
          consumedAt: data.consumedAt as Date | undefined,
          verifiedAt: data.verifiedAt as Date | undefined,
          exchangedAt: data.exchangedAt as Date | undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        magicLinks.set(record.id, record);
        return record;
      },
      findUnique({ where }: { where: Record<string, unknown> }) {
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
      update({
        data,
        where,
      }: {
        data: Record<string, unknown>;
        where: Record<string, unknown>;
      }) {
        const existing = this.findUnique({ where });

        if (!existing) {
          throw new Error('Magic link not found');
        }

        const updated: MagicLinkRecord = {
          ...existing,
          authRequestId:
            readOptionalString(data.authRequestId) ?? existing.authRequestId,
          email: readOptionalString(data.email) ?? existing.email,
          tokenHash: readOptionalString(data.tokenHash) ?? existing.tokenHash,
          expiresAt: readOptionalDate(data.expiresAt) ?? existing.expiresAt,
          consumedAt:
            readOptionalDate(data.consumedAt) ?? existing.consumedAt,
          verifiedAt:
            readOptionalDate(data.verifiedAt) ?? existing.verifiedAt,
          exchangedAt:
            readOptionalDate(data.exchangedAt) ?? existing.exchangedAt,
          createdAt: existing.createdAt,
          updatedAt: new Date(),
        };

        magicLinks.set(updated.id, updated);
        return updated;
      },
    },
    user: {
      findUnique({ where }: { where: Record<string, unknown> }) {
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
      upsert({
        create,
        where,
      }: {
        create: Record<string, unknown>;
        update: Record<string, unknown>;
        where: Record<string, unknown>;
      }) {
        const existing = this.findUnique({ where });

        if (existing) {
          return existing;
        }

        userId += 1;
        const record: UserRecord = {
          id: `user_${userId}`,
          email: String(create.email),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        users.set(record.id, record);
        return record;
      },
    },
  };
}

const prismaMock = createPrismaMock();
const sendMagicLinkMock = vi.fn<(message: MagicLinkEmail) => Promise<void>>(
  () => Promise.resolve(),
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
    const loginPayload = JSON.parse(loginResponse.payload) as LoginResponse;

    expect(loginResponse.statusCode).toBe(200);
    expect(loginPayload.expiresInSeconds).toBe(900);
    expect(sendMagicLinkMock).toHaveBeenCalledTimes(1);

    const sentEmail = sendMagicLinkMock.mock.calls.at(0)?.[0];

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
    const statusPayload = JSON.parse(
      statusResponse.payload,
    ) as MagicLinkStatusResponse;

    expect(statusResponse.statusCode).toBe(200);
    expect(statusPayload.status).toBe('completed');

    const authPayload = statusPayload.auth;

    expect(authPayload).toBeDefined();
    if (!authPayload) {
      throw new Error('Expected auth payload for completed magic-link status');
    }

    expect(authPayload.tokenType).toBe('Bearer');

    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${authPayload.accessToken}`,
      },
    });

    expect(meResponse.statusCode).toBe(200);
    expect(JSON.parse(meResponse.payload)).toEqual({
      email: authPayload.user.email,
      id: authPayload.user.id,
    });

    const refreshResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {
        refreshToken: authPayload.refreshToken,
      },
    });
    const refreshPayload = JSON.parse(refreshResponse.payload) as AuthResponse;

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
    expect(JSON.parse(logoutResponse.payload) as LogoutResponse).toEqual({
      success: true,
    });
  });
});
