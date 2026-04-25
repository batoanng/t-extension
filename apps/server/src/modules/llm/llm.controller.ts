import { Body, Controller, Post } from '@nestjs/common';

import { LlmDemoRequestSchema } from './llm.schemas';
import { LlmService } from './llm.service';

@Controller('llm')
export class LlmController {
  constructor(private readonly llm: LlmService) {}

  @Post('demo')
  async runDemo(@Body() body: unknown) {
    const request = LlmDemoRequestSchema.parse(body);

    return this.llm.runPromptChain(request);
  }
}
