import { Inject, Injectable } from '@nestjs/common';
import OpenAI from 'openai';

import type { Config } from '../../types/config';
import { Service } from '../tokens';
import type { LlmDemoRequest } from './llm.schemas';
import { OPENAI_CLIENT } from './openai.provider';

@Injectable()
export class LlmService {
  constructor(
    @Inject(OPENAI_CLIENT) private readonly openAi: OpenAI,
    @Inject(Service.CONFIG) private readonly config: Config,
  ) {}

  async runPromptChain(request: LlmDemoRequest) {
    const completion = await this.openAi.chat.completions.create({
      model: this.config.OPENAI_MODEL,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: 'You are the concise LLM demo for a generated NestJS server.',
        },
        {
          role: 'user',
          content:
            `Summarize the intent of the following prompt in one short paragraph.\n\n${request.prompt}`,
        },
      ],
    });

    const output =
      completion.choices.find(
        (choice) =>
          typeof choice.message.content === 'string' &&
          choice.message.content.trim().length > 0,
      )?.message.content?.trim() ?? '';

    return {
      provider: request.provider,
      model: this.config.OPENAI_MODEL,
      output,
    };
  }
}
