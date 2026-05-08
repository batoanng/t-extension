import { useCallback, useReducer } from 'react';

import { generateBrief } from '@/shared/api';
import { addRecentContextPackOutput } from '@/shared/lib/contextPackStorage';
import type { GenerationAccess } from '@/shared/model/access';
import {
  type GenerateBriefRequest,
  type GenerateBriefResponse,
  type GenerationApiClientErrorCode,
  GenerationApiError,
  type RecentContextPackOutput,
} from '@/shared/model/contextPack';

const generationRequestTimeoutMs = 30_000;

interface GenerateBriefState {
  copyStatus: 'idle' | 'success' | 'error';
  errorMessage: string | null;
  recentOutputs: RecentContextPackOutput[];
  result: GenerateBriefResponse | null;
  status: 'idle' | 'loading' | 'success' | 'error';
}

type GenerateBriefAction =
  | { type: 'generate-started' }
  | {
      recentOutputs: RecentContextPackOutput[];
      result: GenerateBriefResponse;
      type: 'generate-succeeded';
    }
  | { errorMessage: string; type: 'generate-failed' }
  | { recentOutputs: RecentContextPackOutput[]; type: 'recent-loaded' }
  | { type: 'copy-succeeded' }
  | { errorMessage: string; type: 'copy-failed' };

const initialState: GenerateBriefState = {
  copyStatus: 'idle',
  errorMessage: null,
  recentOutputs: [],
  result: null,
  status: 'idle',
};

function reducer(
  state: GenerateBriefState,
  action: GenerateBriefAction,
): GenerateBriefState {
  switch (action.type) {
    case 'generate-started':
      return {
        ...state,
        copyStatus: 'idle',
        errorMessage: null,
        status: 'loading',
      };
    case 'generate-succeeded':
      return {
        copyStatus: 'idle',
        errorMessage: null,
        recentOutputs: action.recentOutputs,
        result: action.result,
        status: 'success',
      };
    case 'generate-failed':
      return {
        ...state,
        copyStatus: 'idle',
        errorMessage: action.errorMessage,
        status: 'error',
      };
    case 'recent-loaded':
      return {
        ...state,
        recentOutputs: action.recentOutputs,
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

interface RunGenerateBriefParams {
  access: GenerationAccess;
  payload: GenerateBriefRequest;
  serverBaseUrl: string;
}

type RunGenerateBriefResult =
  | {
      ok: true;
      result: GenerateBriefResponse;
    }
  | {
      errorCode: GenerationApiClientErrorCode;
      ok: false;
    };

export function useGenerateBrief() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const loadRecentOutputs = useCallback(
    (recentOutputs: RecentContextPackOutput[]) => {
      dispatch({ recentOutputs, type: 'recent-loaded' });
    },
    [],
  );
  const copyMarkdown = useCallback(async () => {
    if (!state.result?.markdown) {
      return;
    }

    try {
      await navigator.clipboard.writeText(state.result.markdown);
      dispatch({ type: 'copy-succeeded' });
    } catch {
      dispatch({
        errorMessage: 'Unable to copy the markdown. Please copy it manually.',
        type: 'copy-failed',
      });
    }
  }, [state.result?.markdown]);

  return {
    ...state,
    copyMarkdown,
    loadRecentOutputs,
    async runGenerateBrief({
      access,
      payload,
      serverBaseUrl,
    }: RunGenerateBriefParams): Promise<RunGenerateBriefResult> {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, generationRequestTimeoutMs);

      dispatch({ type: 'generate-started' });

      try {
        const result = await generateBrief({
          access,
          payload,
          signal: controller.signal,
          serverBaseUrl,
        });
        const recentOutputs = await addRecentContextPackOutput({
          createdAt: result.createdAt,
          id: result.id,
          markdown: result.markdown,
          outputType: result.outputType,
          sourceTitle: payload.context.title ?? 'Untitled context',
          targetRole: result.targetRole,
          title: result.title,
        });

        dispatch({ recentOutputs, result, type: 'generate-succeeded' });
        return {
          ok: true,
          result,
        };
      } catch (error) {
        const errorCode =
          error instanceof GenerationApiError
            ? error.code
            : 'NETWORK_ERROR';
        dispatch({
          errorMessage:
            error instanceof GenerationApiError
              ? error.message
              : 'Unable to generate the brief. Please try again.',
          type: 'generate-failed',
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
