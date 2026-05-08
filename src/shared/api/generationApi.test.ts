import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GenerationApiError } from '@/shared/model/contextPack';

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
  options: {
    includeComments: true,
    includeLinkedItems: true,
    includeMissingInfo: true,
    includePromptForAI: true,
    includeQuestions: true,
    outputFormat: 'markdown' as const,
    tone: 'detailed' as const,
  },
  outputType: 'implementation_brief' as const,
  targetRole: 'developer' as const,
};

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
        markdown: '# Brief',
        missingInformation: [],
        outputType: 'implementation_brief',
        questions: [],
        targetRole: 'developer',
        title: 'Brief',
        warnings: [],
      }),
    );

    await expect(
      generateBrief({
        access: {
          apiKey: 'sk-test',
          kind: 'byok',
          model: 'gpt-5.5',
          provider: 'openai',
        },
        payload,
        serverBaseUrl: 'http://localhost:3000',
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
          model: 'gpt-5.5',
          provider: 'openai',
        },
        payload,
        serverBaseUrl: 'http://localhost:3000',
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<GenerationApiError>>({
        code: 'MISSING_BYOK_API_KEY',
      }),
    );
  });
});
