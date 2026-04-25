import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  type: 'access';
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<
      FastifyRequest & { user: AuthenticatedUser }
    >();

    return request.user;
  },
);
