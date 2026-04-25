import { z } from 'zod';

export const promptTargetAgentValues = [
  'generic',
  'codex',
  'claude-code',
  'cursor',
  'windsurf',
  'chatgpt',
] as const;

export const promptOutputStyleValues = [
  'structured',
  'concise',
  'detailed',
] as const;

export const promptCredentialModeValues = ['byok', 'subscription'] as const;

export const PromptApiKeySchema = z.string().trim().min(1);

export const PromptOptimizeRequestSchema = z.object({
  prompt: z.string().trim().min(3).max(8000),
  mode: z.literal('developer-agent').default('developer-agent'),
  credentialMode: z.enum(promptCredentialModeValues).default('byok'),
  targetAgent: z.enum(promptTargetAgentValues).default('generic'),
  outputStyle: z.enum(promptOutputStyleValues).default('structured'),
});

export type PromptOptimizeRequest = z.infer<
  typeof PromptOptimizeRequestSchema
>;
