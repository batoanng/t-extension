import { useCallback, useReducer } from 'react';

import { generateBrief } from '@/shared/api';
import { addRecentContextPackOutput } from '@/shared/lib/contextPackStorage';
import type { GenerationAccess } from '@/shared/model/access';
import {
  type RecentGenerationOutput,
  ExtractedContextSchema,
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
  | { result: GenerateBriefResponse; type: 'result-restored' }
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
    case 'result-restored':
      return {
        ...state,
        copyStatus: 'idle',
        errorMessage: null,
        result: action.result,
        status: 'success',
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
  const restoreGenerationOutput = useCallback((output: RecentGenerationOutput) => {
    dispatch({
      result: {
        agentType: output.agentType,
        confidence: 'medium',
        createdAt: output.createdAt,
        id: output.id,
        markdown: output.markdown,
        missingInformation: [],
        questions: [],
        title: output.title,
        warnings: [],
      },
      type: 'result-restored',
    });
  }, []);

  return {
    ...state,
    copyMarkdown,
    loadRecentOutputs,
    restoreGenerationOutput,
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
        const parsedContext = ExtractedContextSchema.parse(payload.context);
        const recentOutputs = await addRecentContextPackOutput({
          agentType: result.agentType,
          context: parsedContext,
          createdAt: result.createdAt,
          id: result.id,
          kind: 'generation',
          markdown: result.markdown,
          sourceTitle: parsedContext.title ?? 'Untitled context',
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
