import { z } from 'zod';

import { byokProviders } from './access';

export const sourceTypes = [
  'jira',
  'linear',
  'github_issue',
  'github_pr',
  'notion',
  'confluence',
  'figma',
  'google_docs',
  'gitlab_issue',
  'azure_devops_work_item',
  'trello_card',
  'clickup_task',
  'asana_task',
  'slack_thread',
  'sentry_issue',
  'datadog_incident',
  'storybook_component',
  'swagger_openapi',
  'postman_docs',
  'selected_text',
  'manual',
  'manual_paste',
  'web_page',
  'generic_web',
] as const;

export const agentTypes = [
  'ci-expert',
  'data-analyst',
  'design-architect',
  'planner',
  'security-architect',
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
export const DEFAULT_AGENT_TYPE = 'planner';

export type SourceType = (typeof sourceTypes)[number];
export type AgentType = (typeof agentTypes)[number];
export type GenerationErrorCode = (typeof generationErrorCodes)[number];
export type GenerationMetadataProvider =
  (typeof generationMetadataProviders)[number];

export const LinkedItemSchema = z.object({
  title: z.string().trim().optional(),
  type: z.string().trim().optional(),
  url: z.string().trim().optional(),
});

export const AttachmentMetadataSchema = z.object({
  name: z.string().trim().optional(),
  type: z.string().trim().optional(),
  url: z.string().trim().optional(),
});

export const ExtractedTableSchema = z.object({
  headers: z.array(z.string().trim()).default([]),
  rows: z.array(z.array(z.string().trim())).default([]),
});

export const ExtractedContextSchema = z.object({
  sourceType: z.enum(sourceTypes),
  url: z.string().trim().optional(),
  title: z.string().trim().optional(),
  description: z.string().trim().optional(),
  comments: z.array(z.string().trim()).default([]),
  labels: z.array(z.string().trim()).default([]),
  status: z.string().trim().optional(),
  priority: z.string().trim().optional(),
  assignee: z.string().trim().optional(),
  reporter: z.string().trim().optional(),
  selectedText: z.string().trim().optional(),
  rawText: z.string().trim().optional(),
  linkedItems: z.array(LinkedItemSchema).default([]),
  attachments: z.array(AttachmentMetadataSchema).default([]),
  codeBlocks: z.array(z.string().trim()).default([]),
  tables: z.array(ExtractedTableSchema).default([]),
  extractedAt: z.string().trim().optional(),
});

export const GenerateBriefRequestSchema = z
  .object({
    agentType: z.enum(agentTypes).default(DEFAULT_AGENT_TYPE),
    context: ExtractedContextSchema,
    credentialMode: z.enum(['byok', 'subscription']).default('byok'),
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
  agentType: z.enum(agentTypes),
  markdown: z.string().trim().min(1),
  missingInformation: z.array(MissingInformationItemSchema).default([]),
  questions: z.array(z.string().trim()).default([]),
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

interface RecentContextPackOutputBase {
  createdAt: string;
  id: string;
  markdown: string;
  sourceTitle: string;
  title: string;
}

export interface RecentGenerationOutput extends RecentContextPackOutputBase {
  agentType: AgentType;
  context: ExtractedContext;
  kind: 'generation';
}

export interface RecentCaptureOutput extends RecentContextPackOutputBase {
  kind: 'capture';
  source: {
    title?: string;
    type: 'upload' | 'visible_tab';
    url?: string;
  };
  warnings: string[];
}

export type RecentContextPackOutput =
  | RecentCaptureOutput
  | RecentGenerationOutput;

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

export const agentTypeOptions: Array<{
  label: string;
  value: AgentType;
}> = [
  { label: 'Planner', value: 'planner' },
  { label: 'CI Expert', value: 'ci-expert' },
  { label: 'Data Analyst', value: 'data-analyst' },
  { label: 'Design Architect', value: 'design-architect' },
  { label: 'Security Architect', value: 'security-architect' },
];

export function getContextPlainText(context: ExtractedContext): string {
  return [
    context.title,
    context.description,
    ...context.comments,
    ...context.labels,
    context.status,
    context.priority,
    context.assignee,
    context.reporter,
    context.selectedText,
    context.rawText,
    ...context.linkedItems.map((item) =>
      [item.title, item.url].filter(Boolean).join(' '),
    ),
    ...context.attachments.map((item) =>
      [item.name, item.url].filter(Boolean).join(' '),
    ),
    ...context.codeBlocks,
    ...context.tables.flatMap((table) => [
      ...table.headers,
      ...table.rows.flat(),
    ]),
  ]
    .filter(Boolean)
    .join('\n')
    .trim();
}

export function createManualExtractedContext(input: {
  text: string;
  title?: string;
}): ExtractedContext {
  return {
    attachments: [],
    codeBlocks: [],
    comments: [],
    description: input.text,
    labels: [],
    linkedItems: [],
    sourceType: 'manual_paste',
    tables: [],
    title: input.title ?? 'Input your context...',
  };
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
      return 'OpenRouter rejected the provided API key.';
    case 'BYOK_RATE_LIMITED':
      return 'OpenRouter rate limit was reached. Please wait and try again.';
    case 'BYOK_REQUEST_FAILED':
      return 'OpenRouter could not generate the brief. Please try again.';
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
    case 'github_pr':
      return 'GitHub Pull Request';
    case 'notion':
      return 'Notion Page';
    case 'confluence':
      return 'Confluence Page';
    case 'figma':
      return 'Figma File';
    case 'google_docs':
      return 'Google Doc';
    case 'gitlab_issue':
      return 'GitLab Issue';
    case 'azure_devops_work_item':
      return 'Azure DevOps Work Item';
    case 'trello_card':
      return 'Trello Card';
    case 'clickup_task':
      return 'ClickUp Task';
    case 'asana_task':
      return 'Asana Task';
    case 'slack_thread':
      return 'Slack Thread';
    case 'sentry_issue':
      return 'Sentry Issue';
    case 'datadog_incident':
      return 'Datadog Incident';
    case 'storybook_component':
      return 'Storybook Component';
    case 'swagger_openapi':
      return 'Swagger/OpenAPI Page';
    case 'postman_docs':
      return 'Postman Docs';
    case 'selected_text':
      return 'Selected Text';
    case 'manual':
    case 'manual_paste':
      return 'Manual Context';
    case 'web_page':
    case 'generic_web':
      return 'Web Page';
  }
}
