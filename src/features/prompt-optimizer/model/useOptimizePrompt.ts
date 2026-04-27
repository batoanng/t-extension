import { useReducer } from 'react';

import { optimizePrompt } from '@/shared/api';
import type { OptimizeAccess } from '@/shared/model/access';
import {
  type OptimizePromptRequest,
  type OptimizePromptResponse,
  type PromptApiClientErrorCode,
  PromptApiError,
} from '@/shared/model/prompt';

const optimizeRequestTimeoutMs = 30_000;

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
  access: OptimizeAccess;
  payload: OptimizePromptRequest;
  serverBaseUrl: string;
}

type RunOptimizePromptResult =
  | {
      ok: true;
      result: OptimizePromptResponse;
    }
  | {
      errorCode: PromptApiClientErrorCode;
      ok: false;
    };

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
      access,
      payload,
      serverBaseUrl,
    }: RunOptimizePromptParams): Promise<RunOptimizePromptResult> {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, optimizeRequestTimeoutMs);

      dispatch({ type: 'optimize-started' });

      try {
        const result = await optimizePrompt({
          access,
          payload,
          signal: controller.signal,
          serverBaseUrl,
        });

        dispatch({ type: 'optimize-succeeded', result });
        return {
          ok: true,
          result,
        };
      } catch (error) {
        const errorCode =
          error instanceof PromptApiError ? error.code : 'NETWORK_ERROR';
        dispatch({
          type: 'optimize-failed',
          errorMessage:
            error instanceof PromptApiError
              ? error.message
              : 'Unable to optimize prompt. Please try again.',
        });
        return {
          errorCode,
          ok: false,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    },
  };
}
