import { useMutation } from '@tanstack/react-query';

import {
  type GenerateBriefParams,
  generateBrief,
} from './generationApi';
import type {
  GenerateBriefResponse,
  GenerationApiError,
} from '@/shared/model/contextPack';

export function useGenerateBriefMutation() {
  return useMutation<
    GenerateBriefResponse,
    GenerationApiError,
    GenerateBriefParams
  >({
    mutationFn: generateBrief,
    retry: false,
  });
}
