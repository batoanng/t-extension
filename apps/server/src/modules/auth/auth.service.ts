import { createHash, randomBytes, randomUUID } from 'node:crypto';

import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';

import type { Config } from '../../types/config';
import { PrismaService } from '../common/provider';
import { Service } from '../tokens';
import type { AuthenticatedUser } from './current-user.decorator';
import { MagicLinkMailerService } from './magic-link-mailer.service';
import type {
  AuthResponse,
  AuthUser,
  MagicLinkStatusResponse,
} from './types/auth.types';
import { MagicLinkStatus } from './types/auth.types';

const refreshTokenPayloadSchema = z
  .object({
    sub: z.string().min(1),
    email: z.string().email(),
    type: z.literal('refresh'),
  })
  .passthrough();

const accessTokenPayloadSchema = z
  .object({
    sub: z.string().min(1),
    email: z.string().email(),
    type: z.literal('access'),
  })
  .passthrough();

type SignAsyncOptions = NonNullable<Parameters<JwtService['signAsync']>[1]>;

@Injectable()
export class AuthService {
  constructor(
    @Inject(JwtService)
    private readonly jwtService: JwtService,
    @Inject(Service.CONFIG) private readonly config: Config,
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(MagicLinkMailerService)
    private readonly magicLinkMailerService: MagicLinkMailerService,
  ) {}

  async requestMagicLink(
    email: string,
    verifyBaseUrl: string,
  ): Promise<{ authRequestId: string; expiresInSeconds: number }> {
    const normalizedEmail = email.trim().toLowerCase();
    const authRequestId = randomUUID();
    const rawToken = randomBytes(32).toString('hex');
    const expiresInSeconds = 15 * 60;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const tokenHash = this.hashToken(rawToken);
    const verifyUrl = new URL(
      `/api/v${this.config.API_VERSION}/auth/verify-magic-link`,
      verifyBaseUrl,
    );

    verifyUrl.searchParams.set('token', rawToken);

    await this.prismaService.magicLinkToken.create({
      data: {
        authRequestId,
        email: normalizedEmail,
        expiresAt,
        tokenHash,
      },
    });

    await this.magicLinkMailerService.sendMagicLink({
      email: normalizedEmail,
      verifyUrl: verifyUrl.toString(),
    });

    return {
      authRequestId,
      expiresInSeconds,
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const payload = await this.verifyRefreshToken(refreshToken);

    return this.issueTokenPair({
      id: payload.sub,
      email: payload.email,
    });
  }

  async logout(refreshToken: string): Promise<{ success: true }> {
    await this.verifyRefreshToken(refreshToken);

    return { success: true };
  }

  async me(user: AuthenticatedUser): Promise<AuthUser> {
    const persistedUser = await this.prismaService.user.findUnique({
      where: {
        id: user.sub,
      },
    });

    if (!persistedUser) {
      throw new UnauthorizedException('Unauthorized');
    }

    return {
      id: persistedUser.id,
      email: persistedUser.email,
    };
  }

  async getMagicLinkStatus(requestId: string): Promise<MagicLinkStatusResponse> {
    const magicLinkRequest = await this.prismaService.magicLinkToken.findUnique({
      where: {
        authRequestId: requestId,
      },
    });

    if (!magicLinkRequest) {
      throw new NotFoundException('Magic link request not found.');
    }

    if (magicLinkRequest.expiresAt.getTime() <= Date.now()) {
      return {
        status: MagicLinkStatus.Expired,
      };
    }

    if (!magicLinkRequest.verifiedAt) {
      return {
        status: MagicLinkStatus.Pending,
      };
    }

    if (magicLinkRequest.exchangedAt) {
      return {
        status: MagicLinkStatus.Expired,
      };
    }

    const user = await this.prismaService.user.upsert({
      where: {
        email: magicLinkRequest.email,
      },
      update: {},
      create: {
        email: magicLinkRequest.email,
      },
    });
    const auth = await this.issueTokenPair(user);

    await this.prismaService.magicLinkToken.update({
      where: {
        id: magicLinkRequest.id,
      },
      data: {
        exchangedAt: new Date(),
      },
    });

    return {
      status: MagicLinkStatus.Completed,
      auth,
    };
  }

  async verifyMagicLink(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const magicLinkRequest = await this.prismaService.magicLinkToken.findUnique({
      where: {
        tokenHash,
      },
    });

    if (
      !magicLinkRequest ||
      magicLinkRequest.expiresAt.getTime() <= Date.now() ||
      magicLinkRequest.consumedAt
    ) {
      throw new UnauthorizedException('Invalid or expired magic link.');
    }

    await this.prismaService.magicLinkToken.update({
      where: {
        id: magicLinkRequest.id,
      },
      data: {
        consumedAt: new Date(),
        verifiedAt: new Date(),
      },
    });
  }

  async authenticateAccessToken(
    authorizationHeader: string | undefined,
  ): Promise<AuthenticatedUser> {
    const accessToken = this.extractBearerToken(authorizationHeader);

    if (!accessToken) {
      throw new UnauthorizedException('Unauthorized');
    }

    try {
      const payload = await this.jwtService.verifyAsync(accessToken, {
        secret: this.config.ACCESS_SECRET,
      });

      return accessTokenPayloadSchema.parse(payload) as AuthenticatedUser;
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
  }

  private toExpiresIn(value: string): SignAsyncOptions['expiresIn'] {
    return value as SignAsyncOptions['expiresIn'];
  }

  private async issueTokenPair(user: AuthUser): Promise<AuthResponse> {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        type: 'access',
      },
      {
        secret: this.config.ACCESS_SECRET,
        expiresIn: this.toExpiresIn(this.config.ACCESS_EXPIRES_IN),
      },
    );
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        type: 'refresh',
      },
      {
        secret: this.config.REFRESH_SECRET,
        expiresIn: this.toExpiresIn(this.config.REFRESH_EXPIRES_IN),
      },
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      accessTokenExpiresIn: this.config.ACCESS_EXPIRES_IN_SECONDS,
      refreshTokenExpiresIn: this.config.REFRESH_EXPIRES_IN_SECONDS,
      user,
    };
  }

  private async verifyRefreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.REFRESH_SECRET,
      });

      return refreshTokenPayloadSchema.parse(payload);
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private extractBearerToken(authorizationHeader: string | undefined) {
    if (!authorizationHeader) {
      return null;
    }

    const [scheme, token] = authorizationHeader.trim().split(/\s+/);

    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
