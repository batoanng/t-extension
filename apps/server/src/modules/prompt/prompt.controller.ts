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
    @Inject(PromptService)
    private readonly promptService: PromptService,
  ) {}

  @Post('optimize')
  @HttpCode(200)
  async optimizePrompt(
    @Body() body: unknown,
    @Headers('x-openai-api-key') apiKey: string | undefined,
    @Req() request: FastifyRequest,
  ) {
    const parsedApiKey = PromptApiKeySchema.safeParse(apiKey);

    if (!parsedApiKey.success) {
      throw new PromptHttpException(
        401,
        'MISSING_OPENAI_API_KEY',
        getPromptErrorMessage('MISSING_OPENAI_API_KEY'),
      );
    }

    try {
      const parsedRequest = PromptOptimizeRequestSchema.parse(body);

      return await this.promptService.optimizePrompt({
        ...parsedRequest,
        apiKey: parsedApiKey.data,
        clientIp: request.ip ?? 'unknown',
      });
    } catch (error) {
      throw toPromptHttpException(error);
    }
  }
}
