import { useReducer } from 'react';
import { optimizePrompt } from '@/shared/api';
import {
  type OptimizePromptRequest,
  type OptimizePromptResponse,
  PromptApiError,
} from '@/shared/model/prompt';

interface OptimizePromptState {
  copyStatus: 'idle' | 'success' | 'error';
  errorMessage: string | null;
  result: OptimizePromptResponse | null;
  status: 'idle' | 'loading' | 'success' | 'error';
}

type OptimizePromptAction =
  | { type: 'optimize-started' }
  | { type: 'optimize-succeeded'; result: OptimizePromptResponse }
  | { type: 'optimize-failed'; errorMessage: string }
  | { type: 'copy-succeeded' }
  | { type: 'copy-failed'; errorMessage: string };

const initialState: OptimizePromptState = {
  copyStatus: 'idle',
  errorMessage: null,
  result: null,
  status: 'idle',
};

function reducer(
  state: OptimizePromptState,
  action: OptimizePromptAction,
): OptimizePromptState {
  switch (action.type) {
    case 'optimize-started':
      return {
        ...state,
        copyStatus: 'idle',
        errorMessage: null,
        status: 'loading',
      };
    case 'optimize-succeeded':
      return {
        copyStatus: 'idle',
        errorMessage: null,
        result: action.result,
        status: 'success',
      };
    case 'optimize-failed':
      return {
        ...state,
        copyStatus: 'idle',
        errorMessage: action.errorMessage,
        status: 'error',
      };
    case 'copy-succeeded':
      return {
        ...state,
        copyStatus: 'success',
      };
    case 'copy-failed':
      return {
        ...state,
        copyStatus: 'error',
        errorMessage: action.errorMessage,
      };
  }
}

interface RunOptimizePromptParams {
  apiKey: string;
  payload: OptimizePromptRequest;
  serverBaseUrl: string;
}

export function useOptimizePrompt() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return {
    ...state,
    async copyOptimizedPrompt() {
      if (!state.result?.optimizedPrompt) {
        return;
      }

      try {
        await navigator.clipboard.writeText(state.result.optimizedPrompt);
        dispatch({ type: 'copy-succeeded' });
      } catch {
        dispatch({
          type: 'copy-failed',
          errorMessage:
            'Unable to copy the optimized prompt. Please copy it manually.',
        });
      }
    },
    async runOptimizePrompt({
      apiKey,
      payload,
      serverBaseUrl,
    }: RunOptimizePromptParams) {
      dispatch({ type: 'optimize-started' });

      try {
        const result = await optimizePrompt({
          apiKey,
          payload,
          serverBaseUrl,
        });

        dispatch({ type: 'optimize-succeeded', result });
      } catch (error) {
        dispatch({
          type: 'optimize-failed',
          errorMessage:
            error instanceof PromptApiError
              ? error.message
              : 'Unable to optimize prompt. Please try again.',
        });
      }
    },
  };
}
