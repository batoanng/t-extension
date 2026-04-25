import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import type { Config } from '../../../types/config';
import { Service } from '../../tokens';

@Injectable()
export class HealthGuard implements CanActivate {
  constructor(@Inject(Service.CONFIG) private readonly config: Config) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    return request.headers.authorization === `Bearer ${this.config.HEALTH_TOKEN}`;
  }
}
