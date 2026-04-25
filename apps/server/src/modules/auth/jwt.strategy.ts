import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { z } from 'zod';

import type { Config } from '../../types/config';
import { Service } from '../tokens';
import type { AuthenticatedUser } from './current-user.decorator';

const jwtPayloadSchema = z
  .object({
    sub: z.string().min(1),
    email: z.string().email(),
    type: z.literal('access'),
  })
  .passthrough();

type JwtPayload = z.infer<typeof jwtPayloadSchema>;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(Service.CONFIG) config: Config) {
    super({
      secretOrKey: config.ACCESS_SECRET,
      algorithms: ['HS256'],
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  validate(payload: unknown): AuthenticatedUser {
    const validatedPayload = jwtPayloadSchema.parse(payload) as JwtPayload;

    return {
      sub: validatedPayload.sub,
      email: validatedPayload.email,
      type: validatedPayload.type,
    };
  }
}
