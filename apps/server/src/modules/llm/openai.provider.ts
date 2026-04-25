import OpenAI from 'openai';

import type { Config } from '../../types/config';
import { Service } from '../tokens';

export const OPENAI_CLIENT = Symbol('OPENAI_CLIENT');

export const openAiClientProvider = {
  provide: OPENAI_CLIENT,
  inject: [Service.CONFIG],
  useFactory: (config: Config): OpenAI =>
    new OpenAI({
      apiKey: config.OPENAI_API_KEY,
    }),
};
