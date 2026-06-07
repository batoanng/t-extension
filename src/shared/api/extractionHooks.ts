import { useMutation } from '@tanstack/react-query';

import {
  type ExtractMarkdownParams,
  extractMarkdown,
} from './extractionApi';
import type {
  ExtractMarkdownResponse,
  ExtractionApiError,
} from '@/shared/model/extraction';

export function useExtractMarkdownMutation() {
  return useMutation<
    ExtractMarkdownResponse,
    ExtractionApiError,
    ExtractMarkdownParams
  >({
    mutationFn: extractMarkdown,
    retry: false,
  });
}
