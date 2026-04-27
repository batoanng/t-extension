import { z } from 'zod';

export const promptByokProviderValues = [
  'openai',
  'claude',
  'deepseek',
  'gemini',
  'grok',
] as const;

export const promptPurposeValues = [
  'general',
  'design',
  'technical-planning',
  'solution-architecture',
  'test-strategy',
  'deployment-planning',
] as const;

export const promptOutputStyleValues = [
  'structured',
  'concise',
  'detailed',
] as const;

export const promptCredentialModeValues = ['byok', 'subscription'] as const;

export const PromptApiKeySchema = z.string().trim().min(1);

export const PromptOptimizeRequestSchema = z
  .object({
    prompt: z.string().trim().min(3).max(8000),
    mode: z.literal('developer-agent').default('developer-agent'),
    credentialMode: z.enum(promptCredentialModeValues).default('byok'),
    provider: z.enum(promptByokProviderValues).optional(),
    model: z.string().trim().min(1).optional(),
    purpose: z.enum(promptPurposeValues).default('general'),
    outputStyle: z.enum(promptOutputStyleValues).default('structured'),
    includeResponseFraming: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (value.credentialMode !== 'byok') {
      return;
    }

    if (!value.provider) {
      context.addIssue({
        code: 'custom',
        message: 'Provider is required for BYOK requests.',
        path: ['provider'],
      });
    }

    if (!value.model) {
      context.addIssue({
        code: 'custom',
        message: 'Model is required for BYOK requests.',
        path: ['model'],
      });
    }
  });

export type PromptOptimizeRequest = z.infer<
  typeof PromptOptimizeRequestSchema
>;
