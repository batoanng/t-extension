import { Module } from '@nestjs/common';

import { CommonModule } from '../common';
import { LlmController } from './llm.controller';
import { LlmService } from './llm.service';
import { openAiClientProvider } from './openai.provider';

@Module({
  imports: [CommonModule],
  controllers: [LlmController],
  providers: [openAiClientProvider, LlmService],
  exports: [LlmService],
})
export class LlmFeatureModule {}
