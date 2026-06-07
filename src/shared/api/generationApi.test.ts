import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GenerateBriefRequestSchema,
  GenerationApiError,
  type SourceType,
} from '@/shared/model/contextPack';

import { generateBrief } from './generationApi';

vi.mock('axios', () => ({
  default: {
    isAxiosError: (error: unknown) =>
      Boolean((error as { isAxiosError?: boolean } | null)?.isAxiosError),
    request: vi.fn(),
  },
}));

function createAxiosResponse<T>(data: T, status = 200) {
  return {
    data,
    status,
  };
}

const payload = {
  context: {
    comments: [],
    description: 'Build discount validation.',
    labels: [],
    sourceType: 'manual' as const,
    title: 'Discount validation',
  },
  agentType: 'planner' as const,
  options: {
    includeComments: true,
    includeLinkedItems: true,
    includeMissingInfo: true,
    includePromptForAI: true,
    includeQuestions: true,
    outputFormat: 'markdown' as const,
    tone: 'detailed' as const,
  },
};

const v1SourceTypes = [
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
  'github_pr',
  'notion',
  'confluence',
  'manual_paste',
  'generic_web',
] as const satisfies readonly SourceType[];

describe('generateBrief', () => {
  beforeEach(() => {
    vi.mocked(axios.request).mockReset();
  });

  it('posts BYOK generation requests to the generations endpoint', async () => {
    vi.mocked(axios.request).mockResolvedValue(
      createAxiosResponse({
        confidence: 'high',
        createdAt: '2026-05-08T00:00:00.000Z',
        id: 'gen_123',
        agentType: 'planner',
        markdown: '# Brief',
        missingInformation: [],
        questions: [],
        title: 'Brief',
        warnings: [],
      }),
    );

    await expect(
      generateBrief({
        access: {
          apiKey: 'sk-test',
          kind: 'byok',
          model: 'openrouter/auto',
          provider: 'openrouter',
        },
        payload,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'gen_123',
        markdown: '# Brief',
      }),
    );

    expect(axios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-byok-api-key': 'sk-test',
        }),
        method: 'POST',
        url: 'http://localhost:3000/api/v1/generations',
      }),
    );
  });

  it('maps API errors to GenerationApiError', async () => {
    vi.mocked(axios.request).mockResolvedValue(
      createAxiosResponse(
        {
          error: {
            code: 'MISSING_BYOK_API_KEY',
            message: 'Missing key',
          },
        },
        401,
      ),
    );

    await expect(
      generateBrief({
        access: {
          apiKey: '',
          kind: 'byok',
          model: 'openrouter/auto',
          provider: 'openrouter',
        },
        payload,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<GenerationApiError>>({
        code: 'MISSING_BYOK_API_KEY',
      }),
    );
  });

  it.each(v1SourceTypes)('accepts %s source contexts', (sourceType) => {
    expect(() =>
      GenerateBriefRequestSchema.parse({
        ...payload,
        context: {
          ...payload.context,
          sourceType,
        },
      }),
    ).not.toThrow();
  });
});
