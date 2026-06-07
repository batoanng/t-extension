import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ExtractMarkdownRequestSchema,
  ExtractionApiError,
} from '@/shared/model/extraction';

import { extractMarkdown } from './extractionApi';

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
  dataBase64: 'aGVsbG8=',
  filename: 'source.png',
  mimeType: 'image/png' as const,
  source: {
    title: 'Source',
    type: 'upload' as const,
  },
};

describe('extractMarkdown', () => {
  beforeEach(() => {
    vi.mocked(axios.request).mockReset();
  });

  it('posts OpenAI BYOK extraction requests to the extractions endpoint', async () => {
    vi.mocked(axios.request).mockResolvedValue(
      createAxiosResponse({
        confidence: 'high',
        createdAt: '2026-06-06T00:00:00.000Z',
        id: 'ext_123',
        markdown: '# Extracted',
        title: 'Extracted',
        warnings: [],
      }),
    );

    await expect(
      extractMarkdown({
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
        id: 'ext_123',
        markdown: '# Extracted',
      }),
    );

    expect(axios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mimeType: 'image/png',
          provider: 'openai',
        }),
        headers: expect.objectContaining({
          'x-byok-api-key': 'sk-test',
        }),
        method: 'POST',
        url: 'http://localhost:3000/api/v1/extractions',
      }),
    );
  });

  it('maps API errors to ExtractionApiError', async () => {
    vi.mocked(axios.request).mockResolvedValue(
      createAxiosResponse(
        {
          error: {
            code: 'UNSUPPORTED_PROVIDER',
            message: 'Unsupported provider',
          },
        },
        400,
      ),
    );

    await expect(
      extractMarkdown({
        access: {
          apiKey: 'sk-test',
          kind: 'byok',
          model: 'gpt-5.5',
          provider: 'openai',
        },
        payload,
        serverBaseUrl: 'http://localhost:3000',
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<ExtractionApiError>>({
        code: 'UNSUPPORTED_PROVIDER',
      }),
    );
  });

  it('accepts supported v1 source MIME types', () => {
    for (const mimeType of [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ] as const) {
      expect(() =>
        ExtractMarkdownRequestSchema.parse({
          ...payload,
          mimeType,
          model: 'gpt-5.5',
          provider: 'openai',
        }),
      ).not.toThrow();
    }
  });
});
