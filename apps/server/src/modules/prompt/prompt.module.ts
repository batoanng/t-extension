import { Module } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';

import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common';
import { SubscriptionModule } from '../subscription';
import { PromptController } from './prompt.controller';
import {
  PROMPT_MODEL_FACTORY,
  PromptService,
  type PromptModelFactory,
} from './prompt.service';

const promptModelFactoryProvider = {
  provide: PROMPT_MODEL_FACTORY,
  useValue: ((input: Parameters<PromptModelFactory>[0]) =>
    new ChatOpenAI({
      apiKey: input.apiKey,
      configuration: input.baseUrl
        ? {
            baseURL: input.baseUrl,
          }
        : undefined,
      maxRetries: 1,
      model: input.model,
      temperature: 0.2,
    })) satisfies PromptModelFactory,
};

@Module({
  imports: [AuthModule, CommonModule, SubscriptionModule],
  controllers: [PromptController],
  providers: [promptModelFactoryProvider, PromptService],
  exports: [PromptService],
})
export class PromptFeatureModule {}
