import { useCallback, useState } from 'react';

import { useExtractMarkdownMutation } from '@/shared/api';
import { addRecentContextPackOutput } from '@/shared/lib/contextPackStorage';
import type { GenerationAccess } from '@/shared/model/access';
import type { RecentCaptureOutput } from '@/shared/model/contextPack';
import {
  type ExtractMarkdownRequest,
  type ExtractMarkdownResponse,
  ExtractMarkdownRequestSchema,
  ExtractionApiError,
  getExtractionApiErrorMessage,
} from '@/shared/model/extraction';

const extractionRequestTimeoutMs = 45_000;

function getInitialErrorMessage(error: unknown): string {
  if (error instanceof ExtractionApiError) {
    return getExtractionApiErrorMessage(error.code);
  }

  return 'Unable to extract Markdown from this source.';
}

interface RunCaptureMarkdownParams {
  access: GenerationAccess;
  payload: ExtractMarkdownRequest;
  serverBaseUrl: string;
}

export function useCaptureMarkdown() {
  const extractMarkdownMutation = useExtractMarkdownMutation();
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>(
    'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractMarkdownResponse | null>(null);
  const [sourceLabel, setSourceLabel] = useState('No source captured');
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');

  const setCaptureError = useCallback((message: string) => {
    setCopyStatus('idle');
    setErrorMessage(message);
    setStatus('error');
  }, []);

  const restoreCaptureOutput = useCallback((output: RecentCaptureOutput) => {
    setCopyStatus('idle');
    setErrorMessage(null);
    setResult({
      confidence: 'medium',
      createdAt: output.createdAt,
      id: output.id,
      markdown: output.markdown,
      title: output.title,
      warnings: output.warnings,
    });
    setSourceLabel(output.sourceTitle);
    setStatus('success');
  }, []);

  const runCaptureMarkdown = useCallback(
    async ({ access, payload, serverBaseUrl }: RunCaptureMarkdownParams) => {
      const normalizedPayload = ExtractMarkdownRequestSchema.parse(payload);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, extractionRequestTimeoutMs);

      setCopyStatus('idle');
      setErrorMessage(null);
      setResult(null);
      setStatus('loading');
      setSourceLabel(
        normalizedPayload.source.title ??
          normalizedPayload.filename ??
          'Captured source',
      );

      try {
        const nextResult = await extractMarkdownMutation.mutateAsync({
          access,
          payload: normalizedPayload,
          serverBaseUrl,
          signal: controller.signal,
        });

        setResult(nextResult);
        setSourceLabel(nextResult.title);
        setStatus('success');
        await addRecentContextPackOutput({
          createdAt: nextResult.createdAt,
          id: nextResult.id,
          kind: 'capture',
          markdown: nextResult.markdown,
          source: normalizedPayload.source,
          sourceTitle: nextResult.title,
          title: nextResult.title,
          warnings: nextResult.warnings,
        });
        return true;
      } catch (error) {
        setErrorMessage(getInitialErrorMessage(error));
        setStatus('error');
        return false;
      } finally {
        clearTimeout(timeoutId);
      }
    },
    [extractMarkdownMutation],
  );

  const copyMarkdown = useCallback(async () => {
    if (!result?.markdown) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result.markdown);
      setCopyStatus('success');
    } catch {
      setCopyStatus('error');
      setErrorMessage('Unable to copy the markdown. Please copy it manually.');
    }
  }, [result?.markdown]);

  return {
    copyMarkdown,
    copyStatus,
    errorMessage,
    restoreCaptureOutput,
    result,
    runCaptureMarkdown,
    setCaptureError,
    sourceLabel,
    status,
  };
}
