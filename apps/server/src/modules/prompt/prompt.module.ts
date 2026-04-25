import { Module } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';

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
      maxRetries: 1,
      model: input.model,
      temperature: 0.2,
    })) satisfies PromptModelFactory,
};

@Module({
  controllers: [PromptController],
  providers: [promptModelFactoryProvider, PromptService],
  exports: [PromptService],
})
export class PromptFeatureModule {}
