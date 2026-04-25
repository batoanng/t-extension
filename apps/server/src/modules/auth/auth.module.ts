import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import type { Config } from '../../types/config';
import { CommonModule } from '../common';
import { Service } from '../tokens';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [Service.CONFIG],
      imports: [CommonModule],
      useFactory: (config: Config) => ({
        secret: config.ACCESS_SECRET,
      }),
    }),
    CommonModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenGuard, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
