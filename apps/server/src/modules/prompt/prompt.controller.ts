import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  Req,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { AuthService } from '../auth/auth.service';
import {
  PromptHttpException,
  getPromptErrorMessage,
  toPromptHttpException,
} from './prompt.errors';
import { PromptOptimizeRequestSchema, PromptApiKeySchema } from './prompt.schemas';
import { PromptService } from './prompt.service';

@Controller('prompt')
export class PromptController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
    @Inject(PromptService)
    private readonly promptService: PromptService,
  ) {}

  @Post('optimize')
  @HttpCode(200)
  async optimizePrompt(
    @Body() body: unknown,
    @Headers('x-byok-api-key') apiKey: string | undefined,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req() request: FastifyRequest,
  ) {
    try {
      const parsedRequest = PromptOptimizeRequestSchema.parse(body);
      let userId: string | undefined;
      let parsedApiKey: string | undefined;

      if (parsedRequest.credentialMode === 'subscription') {
        try {
          const user =
            await this.authService.authenticateAccessToken(authorizationHeader);
          userId = user.sub;
        } catch {
          throw new PromptHttpException(
            401,
            'AUTH_REQUIRED',
            getPromptErrorMessage('AUTH_REQUIRED'),
          );
        }
      } else {
        const validatedApiKey = PromptApiKeySchema.safeParse(apiKey);

        if (!validatedApiKey.success) {
          throw new PromptHttpException(
            401,
            'MISSING_BYOK_API_KEY',
            getPromptErrorMessage('MISSING_BYOK_API_KEY'),
          );
        }

        parsedApiKey = validatedApiKey.data;
      }

      return await this.promptService.optimizePrompt({
        ...parsedRequest,
        apiKey: parsedApiKey,
        clientIp: request.ip ?? 'unknown',
        userId,
      });
    } catch (error) {
      throw toPromptHttpException(error);
    }
  }
}
