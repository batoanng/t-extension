import { createHash } from 'node:crypto';

import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { z } from 'zod';

import type { Config } from '../../types/config';
import { Service } from '../tokens';
import type { AuthenticatedUser } from './current-user.decorator';

type SignAsyncOptions = NonNullable<Parameters<JwtService['signAsync']>[1]>;

interface AuthUser {
  id: string;
  email: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  user: AuthUser;
}

const refreshTokenPayloadSchema = z
  .object({
    sub: z.string().min(1),
    email: z.string().email(),
    type: z.literal('refresh'),
  })
  .passthrough();

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(Service.CONFIG) private readonly config: Config,
  ) {}

  async login(email: string): Promise<AuthResponse> {
    return this.issueTokenPair(this.buildDemoUser(email));
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

  me(user: AuthenticatedUser): AuthUser {
    return {
      id: user.sub,
      email: user.email,
    };
  }

  private buildDemoUser(email: string): AuthUser {
    const normalizedEmail = email.trim().toLowerCase();

    return {
      id: `user_${createHash('sha256').update(normalizedEmail).digest('hex').slice(0, 24)}`,
      email: normalizedEmail,
    };
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
}
