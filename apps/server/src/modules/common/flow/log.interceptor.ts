import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, finalize } from 'rxjs';

@Injectable()
export class LogInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      method?: string;
      url?: string;
      headers?: Record<string, unknown>;
    }>();
    const response = context.switchToHttp().getResponse<{
      statusCode?: number;
    }>();
    const startedAt = Date.now();

    return next.handle().pipe(
      finalize(() => {
        const durationMs = Date.now() - startedAt;

        console.info(
          JSON.stringify({
            method: request.method ?? 'UNKNOWN',
            url: request.url ?? '/',
            statusCode: response.statusCode ?? 200,
            durationMs,
            requestId: request.headers?.['x-request-id'] ?? null,
          }),
        );
      }),
    );
  }
}
