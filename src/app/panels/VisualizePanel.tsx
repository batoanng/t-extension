import { Copy, GitFork, Network } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useAccessStore } from '@/features/access/model/useAccessStore';
import { useCreateVisualizationMutation } from '@/shared/api';
import { getRecentContextPackOutputs } from '@/shared/lib/contextPackStorage';
import {
  getAccessGate,
  getAccessGateMessage,
  isAccessGateErrorReason,
} from '@/shared/model/access';
import type { RecentContextPackOutput } from '@/shared/model/contextPack';
import type {
  CreateVisualizationResponse,
  VisualizationDiagramType,
  VisualizationItem,
} from '@/shared/model/visualization';
import { InlineMessage } from '@/shared/ui/InlineMessage';

function getOutputKindLabel(output: RecentContextPackOutput): string {
  return output.kind === 'capture' ? 'Capture' : 'Generate';
}

function toVisualizationItem(
  output: RecentContextPackOutput,
): VisualizationItem {
  return {
    id: output.id,
    kind: output.kind,
    markdown: output.markdown,
    sourceTitle: output.sourceTitle,
    title: output.title,
  };
}

function createRenderId(): string {
  return `contextpackai-diagram-${
    globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)
  }`;
}

function MermaidPreview({ mermaidSource }: { mermaidSource: string }) {
  const [svg, setSvg] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!mermaidSource.trim()) {
      setSvg('');
      setErrorMessage(null);
      return undefined;
    }

    void import('mermaid')
      .then(({ default: mermaid }) => {
        mermaid.initialize({
          securityLevel: 'strict',
          startOnLoad: false,
          theme: 'dark',
        });

        return mermaid.render(createRenderId(), mermaidSource);
      })
      .then((rendered) => {
        if (cancelled) {
          return;
        }

        setSvg(rendered.svg);
        setErrorMessage(null);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setSvg('');
        setErrorMessage('Unable to render this Mermaid diagram.');
      });

    return () => {
      cancelled = true;
    };
  }, [mermaidSource]);

  if (errorMessage) {
    return <InlineMessage tone="error">{errorMessage}</InlineMessage>;
  }

  if (!svg) {
    return <InlineMessage>Diagram preview will appear here.</InlineMessage>;
  }

  return (
    <div
      aria-label="Mermaid diagram preview"
      className="mermaid-preview"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function VisualizePanel() {
  const accessStore = useAccessStore();
  const accessGate = getAccessGate(accessStore);
  const createVisualizationMutation = useCreateVisualizationMutation();
  const [recentOutputs, setRecentOutputs] = useState<RecentContextPackOutput[]>(
    [],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [result, setResult] = useState<CreateVisualizationResponse | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>(
    'idle',
  );
  const selectedOutputs = useMemo(
    () => recentOutputs.filter((output) => selectedIds.includes(output.id)),
    [recentOutputs, selectedIds],
  );
  const canCreate =
    accessStore.ready &&
    accessGate.kind === 'allowed' &&
    selectedOutputs.length > 0 &&
    !createVisualizationMutation.isPending;

  useEffect(() => {
    let cancelled = false;

    void getRecentContextPackOutputs().then((outputs) => {
      if (!cancelled) {
        setRecentOutputs(outputs);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function toggleSelected(outputId: string) {
    setSelectedIds((currentIds) =>
      currentIds.includes(outputId)
        ? currentIds.filter((id) => id !== outputId)
        : [...currentIds, outputId],
    );
    setCopyStatus('idle');
  }

  async function handleCreateVisualization(diagramType: VisualizationDiagramType) {
    if (!canCreate) {
      return;
    }

    const access = await accessStore.prepareGenerationAccess();

    if (!access) {
      return;
    }

    try {
      const nextResult = await createVisualizationMutation.mutateAsync({
        access,
        payload: {
          diagramType,
          items: selectedOutputs.map(toVisualizationItem),
        },
      });

      accessStore.clearAccessIssue();
      setResult(nextResult);
      setCopyStatus('idle');
    } catch {
      setCopyStatus('idle');
    }
  }

  async function handleCopyMermaid() {
    if (!result?.mermaid) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result.mermaid);
      setCopyStatus('success');
    } catch {
      setCopyStatus('error');
    }
  }

  return (
    <section className="panel visualize-panel" aria-labelledby="visualize-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="visualize-title">
            Visualize
          </h2>
          <p className="panel-subtitle">
            Select saved Markdown outputs and create a graph or mind map.
          </p>
        </div>
      </div>

      <div className="stack">
        {accessGate.kind === 'blocked' ? (
          <InlineMessage
            tone={
              isAccessGateErrorReason(accessGate.reason) ? 'error' : undefined
            }
          >
            {getAccessGateMessage(accessGate.reason)}
          </InlineMessage>
        ) : null}

        {createVisualizationMutation.error ? (
          <InlineMessage tone="error">
            {createVisualizationMutation.error.message}
          </InlineMessage>
        ) : null}

        {copyStatus === 'success' ? (
          <InlineMessage tone="success">Mermaid copied.</InlineMessage>
        ) : null}

        {copyStatus === 'error' ? (
          <InlineMessage tone="error">Unable to copy Mermaid.</InlineMessage>
        ) : null}

        {recentOutputs.length > 0 ? (
          <div className="recent-output-list" aria-label="Markdown outputs">
            {recentOutputs.map((output) => (
              <label className="selectable-output-row" key={output.id}>
                <input
                  checked={selectedIds.includes(output.id)}
                  onChange={() => {
                    toggleSelected(output.id);
                  }}
                  type="checkbox"
                />
                <span>
                  <strong>{output.title}</strong>
                  <small>
                    {getOutputKindLabel(output)} - {output.sourceTitle}
                  </small>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <InlineMessage>
            Generated briefs and captured Markdown will appear here after your
            first successful run.
          </InlineMessage>
        )}

        <div className="button-row">
          <button
            className="button button-primary"
            disabled={!canCreate}
            onClick={() => {
              void handleCreateVisualization('graph');
            }}
            type="button"
          >
            <Network size={16} strokeWidth={2.2} />
            {createVisualizationMutation.isPending
              ? 'Creating...'
              : 'Create graph'}
          </button>
          <button
            className="button button-secondary"
            disabled={!canCreate}
            onClick={() => {
              void handleCreateVisualization('mindmap');
            }}
            type="button"
          >
            <GitFork size={16} strokeWidth={2.2} />
            Create mind map
          </button>
        </div>

        {result ? (
          <>
            {result.warnings.length > 0 ? (
              <InlineMessage>{result.warnings.join(' ')}</InlineMessage>
            ) : null}

            <MermaidPreview mermaidSource={result.mermaid} />

            <div className="field">
              <label className="field-label" htmlFor="mermaid-source">
                Mermaid source
              </label>
              <textarea
                className="text-area markdown-preview"
                id="mermaid-source"
                readOnly
                value={result.mermaid}
              />
            </div>

            <div className="status-row">
              <button
                className="button button-secondary"
                onClick={() => {
                  void handleCopyMermaid();
                }}
                type="button"
              >
                <Copy size={16} strokeWidth={2.2} />
                Copy Mermaid
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
