import { z } from 'zod';

export const LlmDemoRequestSchema = z.object({
  prompt: z.string().trim().min(1),
  provider: z.enum(['openai']).default('openai'),
});

export type LlmDemoRequest = z.infer<typeof LlmDemoRequestSchema>;
