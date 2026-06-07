import { useMutation } from '@tanstack/react-query';

import {
  createVisualization,
  type CreateVisualizationParams,
} from './visualizationApi';
import type {
  CreateVisualizationResponse,
  VisualizationApiError,
} from '@/shared/model/visualization';

export function useCreateVisualizationMutation() {
  return useMutation<
    CreateVisualizationResponse,
    VisualizationApiError,
    CreateVisualizationParams
  >({
    mutationFn: createVisualization,
    retry: false,
  });
}
