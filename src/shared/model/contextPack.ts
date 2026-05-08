import { z } from 'zod';

import { byokProviders } from './access';

export const sourceTypes = [
  'jira',
  'linear',
  'github_issue',
  'selected_text',
  'manual',
  'web_page',
] as const;

export const targetRoles = [
  'developer',
  'tester',
  'business_analyst',
  'project_manager',
  'designer',
] as const;

export const outputTypes = [
  'implementation_brief',
  'test_plan',
  'requirements_brief',
  'delivery_brief',
  'ux_brief',
] as const;

export const generationMetadataProviders = [
  ...byokProviders,
  'shared-hosted',
] as const;

export const generationErrorCodes = [
  'AUTH_REQUIRED',
  'MISSING_BYOK_API_KEY',
  'INVALID_REQUEST',
  'CONTEXT_TOO_LONG',
  'BYOK_AUTH_FAILED',
  'BYOK_RATE_LIMITED',
  'BYOK_REQUEST_FAILED',
  'SUBSCRIPTION_REQUIRED',
  'SUBSCRIPTION_INACTIVE',
  'HOSTED_GENERATION_UNAVAILABLE',
  'INTERNAL_SERVER_ERROR',
] as const;

export const MIN_CONTEXT_LENGTH = 3;
export const MAX_CONTEXT_LENGTH = 20_000;
export const MAX_RECENT_OUTPUTS = 5;
export const DEFAULT_TARGET_ROLE = 'developer';
export const DEFAULT_OUTPUT_TYPE = 'implementation_brief';

export type SourceType = (typeof sourceTypes)[number];
export type TargetRole = (typeof targetRoles)[number];
export type OutputType = (typeof outputTypes)[number];
export type GenerationErrorCode = (typeof generationErrorCodes)[number];
export type GenerationMetadataProvider =
  (typeof generationMetadataProviders)[number];

export const ExtractedContextSchema = z.object({
  sourceType: z.enum(sourceTypes),
  url: z.string().trim().optional(),
  title: z.string().trim().optional(),
  description: z.string().trim().optional(),
  comments: z.array(z.string().trim()).default([]),
  labels: z.array(z.string().trim()).default([]),
  status: z.string().trim().optional(),
  priority: z.string().trim().optional(),
});

export const GenerateBriefRequestSchema = z
  .object({
    context: ExtractedContextSchema,
    credentialMode: z.enum(['byok', 'subscription']).default('byok'),
    model: z.string().trim().min(1).optional(),
    options: z
      .object({
        includeComments: z.boolean().default(true),
        includeLinkedItems: z.boolean().default(true),
        includeMissingInfo: z.boolean().default(true),
        includePromptForAI: z.boolean().default(true),
        includeQuestions: z.boolean().default(true),
        outputFormat: z.literal('markdown').default('markdown'),
        tone: z.enum(['concise', 'detailed']).default('detailed'),
      })
      .default({
        includeComments: true,
        includeLinkedItems: true,
        includeMissingInfo: true,
        includePromptForAI: true,
        includeQuestions: true,
        outputFormat: 'markdown',
        tone: 'detailed',
      }),
    outputType: z.enum(outputTypes).default(DEFAULT_OUTPUT_TYPE),
    provider: z.enum(byokProviders).optional(),
    targetRole: z.enum(targetRoles).default(DEFAULT_TARGET_ROLE),
  })
  .superRefine((value, context) => {
    const contextText = getContextPlainText(value.context);

    if (contextText.length < MIN_CONTEXT_LENGTH) {
      context.addIssue({
        code: 'custom',
        message: 'Context is required.',
        path: ['context'],
      });
    }

    if (contextText.length > MAX_CONTEXT_LENGTH) {
      context.addIssue({
        code: 'custom',
        message: 'Context is too long.',
        path: ['context'],
      });
    }

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

export const MissingInformationItemSchema = z.object({
  category: z.string().trim().min(1),
  description: z.string().trim().min(1),
  severity: z.enum(['low', 'medium', 'high']),
});

export const GenerateBriefResponseSchema = z.object({
  confidence: z.enum(['low', 'medium', 'high']),
  createdAt: z.string().datetime(),
  id: z.string().trim().min(1),
  markdown: z.string().trim().min(1),
  missingInformation: z.array(MissingInformationItemSchema).default([]),
  outputType: z.enum(outputTypes),
  questions: z.array(z.string().trim()).default([]),
  targetRole: z.enum(targetRoles),
  title: z.string().trim().min(1),
  warnings: z.array(z.string().trim()).default([]),
});

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.enum(generationErrorCodes).catch('INTERNAL_SERVER_ERROR'),
    message: z.string().trim().min(1),
  }),
});

export type ExtractedContext = z.infer<typeof ExtractedContextSchema>;
export type GenerateBriefRequest = z.input<typeof GenerateBriefRequestSchema>;
export type GenerateBriefResponse = z.infer<typeof GenerateBriefResponseSchema>;

export type GenerationApiClientErrorCode =
  | GenerationErrorCode
  | 'NETWORK_ERROR'
  | 'INVALID_RESPONSE'
  | 'REQUEST_TIMEOUT';

export interface RecentContextPackOutput {
  createdAt: string;
  id: string;
  markdown: string;
  outputType: OutputType;
  sourceTitle: string;
  targetRole: TargetRole;
  title: string;
}

export class GenerationApiError extends Error {
  constructor(
    message: string,
    readonly code: GenerationApiClientErrorCode,
    readonly status: number | null = null,
  ) {
    super(message);
    this.name = 'GenerationApiError';
  }
}

export const targetRoleOptions: Array<{
  label: string;
  value: TargetRole;
}> = [
  { label: 'Developer', value: 'developer' },
  { label: 'Tester / QA', value: 'tester' },
  { label: 'Business Analyst', value: 'business_analyst' },
  { label: 'Project Manager', value: 'project_manager' },
  { label: 'Designer', value: 'designer' },
];

export const outputTypeOptions: Array<{
  label: string;
  value: OutputType;
}> = [
  { label: 'Implementation Brief', value: 'implementation_brief' },
  { label: 'Test Plan', value: 'test_plan' },
  { label: 'Requirements Brief', value: 'requirements_brief' },
  { label: 'Delivery Brief', value: 'delivery_brief' },
  { label: 'UX Brief', value: 'ux_brief' },
];

const outputTypeByRole: Record<TargetRole, OutputType> = {
  business_analyst: 'requirements_brief',
  designer: 'ux_brief',
  developer: 'implementation_brief',
  project_manager: 'delivery_brief',
  tester: 'test_plan',
};

export function getDefaultOutputTypeForRole(role: TargetRole): OutputType {
  return outputTypeByRole[role];
}

export function isOutputTypeValidForRole(
  role: TargetRole,
  outputType: OutputType,
): boolean {
  return outputTypeByRole[role] === outputType;
}

export function getContextPlainText(context: ExtractedContext): string {
  return [
    context.title,
    context.description,
    ...context.comments,
    ...context.labels,
    context.status,
    context.priority,
  ]
    .filter(Boolean)
    .join('\n')
    .trim();
}

export function getContextValidationMessage(
  context: ExtractedContext,
): string | null {
  const contextText = getContextPlainText(context);

  if (contextText.length === 0) {
    return 'Extract page context or paste context before generating.';
  }

  if (contextText.length < MIN_CONTEXT_LENGTH) {
    return `Add at least ${MIN_CONTEXT_LENGTH} characters of context.`;
  }

  if (contextText.length > MAX_CONTEXT_LENGTH) {
    return 'The extracted context is too long. Shorten it before generating.';
  }

  return null;
}

export function getGenerationApiErrorMessage(
  code: GenerationApiClientErrorCode,
): string {
  switch (code) {
    case 'AUTH_REQUIRED':
      return 'Please sign in to use shared hosted generation.';
    case 'MISSING_BYOK_API_KEY':
      return 'Please add your API key first.';
    case 'INVALID_REQUEST':
      return 'Please provide valid context.';
    case 'CONTEXT_TOO_LONG':
      return 'The context is too long. Shorten it before generating.';
    case 'BYOK_AUTH_FAILED':
      return 'The selected provider rejected the provided API key.';
    case 'BYOK_RATE_LIMITED':
      return 'The selected provider rate limit was reached. Please wait and try again.';
    case 'BYOK_REQUEST_FAILED':
      return 'The selected provider could not generate the brief. Please try again.';
    case 'SUBSCRIPTION_REQUIRED':
      return 'Subscribe for shared hosted access to use hosted generation.';
    case 'SUBSCRIPTION_INACTIVE':
      return 'Your shared hosted access subscription is inactive.';
    case 'HOSTED_GENERATION_UNAVAILABLE':
      return 'Shared hosted generation is unavailable right now.';
    case 'INTERNAL_SERVER_ERROR':
      return 'Something went wrong. Please try again.';
    case 'INVALID_RESPONSE':
      return 'Unable to generate the brief. Please try again.';
    case 'NETWORK_ERROR':
      return 'Server is unavailable. Please try again later.';
    case 'REQUEST_TIMEOUT':
      return 'Generation timed out after 30 seconds. Please try again.';
  }
}

export function isGenerationErrorCode(
  code: string,
): code is GenerationErrorCode {
  return generationErrorCodes.includes(code as GenerationErrorCode);
}

export function getSourceTypeLabel(sourceType: SourceType): string {
  switch (sourceType) {
    case 'jira':
      return 'Jira Issue';
    case 'linear':
      return 'Linear Issue';
    case 'github_issue':
      return 'GitHub Issue';
    case 'selected_text':
      return 'Selected Text';
    case 'manual':
      return 'Manual Context';
    case 'web_page':
      return 'Web Page';
  }
}
