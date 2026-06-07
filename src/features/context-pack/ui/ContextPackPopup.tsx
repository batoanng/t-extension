import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAccessStore } from '@/features/access/model/useAccessStore';
import { env } from '@/shared/config';
import {
  getLastAgentType,
  getRecentContextPackOutputs,
  setLastAgentType,
} from '@/shared/lib/contextPackStorage';
import { downloadMarkdown } from '@/shared/lib/markdownDownload';
import { getAccessGate, getAccessGateMessage } from '@/shared/model/access';
import {
  DEFAULT_AGENT_TYPE,
  type AgentType,
  type ExtractedContext,
  type RecentGenerationOutput,
  agentTypeOptions,
  getContextValidationMessage,
  getSourceTypeLabel,
} from '@/shared/model/contextPack';
import { InlineMessage } from '@/shared/ui/InlineMessage';

import { extractCurrentTabContext } from '../lib/pageExtraction';
import { useGenerateBrief } from '../model/useGenerateBrief';

const manualContextTemplate: ExtractedContext = {
  attachments: [],
  codeBlocks: [],
  comments: [],
  description: '',
  linkedItems: [],
  labels: [],
  sourceType: 'manual_paste',
  tables: [],
  title: 'Manual context',
};

function createManualContext(value: string): ExtractedContext {
  return {
    ...manualContextTemplate,
    description: value,
  };
}

function getContextPreview(context: ExtractedContext): string {
  return [
    context.title ? `Title: ${context.title}` : null,
    context.status ? `Status: ${context.status}` : null,
    context.priority ? `Priority: ${context.priority}` : null,
    context.assignee ? `Assignee: ${context.assignee}` : null,
    context.reporter ? `Reporter: ${context.reporter}` : null,
    context.labels.length > 0 ? `Labels: ${context.labels.join(', ')}` : null,
    context.linkedItems.length > 0
      ? `Linked items: ${context.linkedItems.length}`
      : null,
    context.attachments.length > 0
      ? `Attachments: ${context.attachments.length}`
      : null,
    context.codeBlocks.length > 0
      ? `Code blocks: ${context.codeBlocks.length}`
      : null,
    context.tables.length > 0 ? `Tables: ${context.tables.length}` : null,
    context.description ? `\n${context.description}` : null,
    context.comments.length > 0
      ? `\nComments:\n${context.comments.map((comment) => `- ${comment}`).join('\n')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');
}

interface ContextPackPopupProps {
  activePanel: 'generate';
  extractionRequestId?: number;
  restoredOutput?: RecentGenerationOutput | null;
}

export function ContextPackPopup({
  activePanel,
  extractionRequestId = 0,
  restoredOutput = null,
}: ContextPackPopupProps) {
  const [context, setContext] = useState<ExtractedContext>(
    manualContextTemplate,
  );
  const [manualContext, setManualContext] = useState('');
  const [agentType, setAgentType] = useState<AgentType>(DEFAULT_AGENT_TYPE);
  const [extractStatus, setExtractStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [extractErrorMessage, setExtractErrorMessage] = useState<string | null>(
    null,
  );
  const accessStore = useAccessStore();
  const {
    copyMarkdown,
    copyStatus,
    errorMessage,
    loadRecentOutputs,
    restoreGenerationOutput,
    result,
    runGenerateBrief,
    status,
  } = useGenerateBrief();
  const accessGate = getAccessGate(accessStore);
  const contextValidationMessage = getContextValidationMessage(context);
  const canGenerate =
    accessStore.ready &&
    accessGate.kind === 'allowed' &&
    contextValidationMessage == null &&
    status !== 'loading';
  const contextPreview = useMemo(() => getContextPreview(context), [context]);
  const hasMounted = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refreshContext = useCallback(async () => {
    setExtractStatus('loading');
    setExtractErrorMessage(null);

    try {
      const extractedContext = await extractCurrentTabContext();

      if (!isMounted.current) {
        return;
      }

      setContext(extractedContext);
      setManualContext(extractedContext.description ?? '');
      setExtractStatus('success');
    } catch {
      if (!isMounted.current) {
        return;
      }

      setExtractStatus('error');
      setExtractErrorMessage(
        'Unable to extract this page. Paste context manually.',
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      getLastAgentType(),
      getRecentContextPackOutputs(),
      refreshContext(),
    ])
      .then(([storedAgentType, storedRecentOutputs]) => {
        if (cancelled) {
          return;
        }

        setAgentType(storedAgentType);
        loadRecentOutputs(storedRecentOutputs);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setExtractStatus('error');
        setExtractErrorMessage(
          'Unable to extract this page. Paste context manually.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [loadRecentOutputs, refreshContext]);

  useEffect(() => {
    if (!restoredOutput) {
      return;
    }

    setAgentType(restoredOutput.agentType);
    setContext(restoredOutput.context);
    setManualContext(restoredOutput.context.description ?? '');
    setExtractStatus('success');
    setExtractErrorMessage(null);
    restoreGenerationOutput(restoredOutput);
    void setLastAgentType(restoredOutput.agentType);
  }, [restoreGenerationOutput, restoredOutput]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    if (activePanel !== 'generate') {
      return;
    }

    void refreshContext();
  }, [activePanel, extractionRequestId, refreshContext]);

  async function handleGenerateClick() {
    if (!canGenerate) {
      return;
    }

    await setLastAgentType(agentType);
    const access = await accessStore.prepareGenerationAccess();

    if (!access) {
      return;
    }

    const generationResult = await runGenerateBrief({
      access,
      payload: {
        context,
        credentialMode: access.kind === 'byok' ? 'byok' : 'subscription',
        agentType,
        options: {
          includeComments: true,
          includeLinkedItems: true,
          includeMissingInfo: true,
          includePromptForAI: true,
          includeQuestions: true,
          outputFormat: 'markdown',
          tone: 'detailed',
        },
      },
      serverBaseUrl: env.serverBaseUrl,
    });

    if (generationResult.ok) {
      accessStore.clearAccessIssue();
      return;
    }

    accessStore.reportGenerationFailure({
      accessKind: access.kind,
      errorCode: generationResult.errorCode,
    });
  }

  function handleManualContextChange(value: string) {
    setManualContext(value);
    setContext(createManualContext(value));
  }

  async function handleRefreshContextClick() {
    await refreshContext();
  }

  return (
    <section
      className="panel context-panel"
      aria-labelledby="context-pack-title"
    >
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="context-pack-title">
            ContextPackAI
          </h2>
          <p className="panel-subtitle">
            Turn the current work item into an agent-specific markdown brief.
          </p>
        </div>
      </div>

      <div className="stack">
        <div className="detected-row">
          <span className="meta-pill">
            Detected: {getSourceTypeLabel(context.sourceType)}
          </span>
          <button
            className="button button-secondary compact-button"
            disabled={extractStatus === 'loading'}
            onClick={() => {
              void handleRefreshContextClick();
            }}
            type="button"
          >
            {extractStatus === 'loading' ? 'Extracting...' : 'Refresh'}
          </button>
        </div>

        {extractErrorMessage ? (
          <InlineMessage tone="error">{extractErrorMessage}</InlineMessage>
        ) : null}

        <div className="selector-grid">
          <div className="field">
            <label className="field-label" htmlFor="agent-type">
              Agent type
            </label>
            <select
              className="select-input"
              disabled={status === 'loading'}
              id="agent-type"
              onChange={(event) => {
                const nextAgentType = event.target.value as AgentType;
                setAgentType(nextAgentType);
                void setLastAgentType(nextAgentType);
              }}
              value={agentType}
            >
              {agentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="manual-context">
            Manual paste fallback
          </label>
          <textarea
            className="text-area manual-context-input"
            disabled={status === 'loading'}
            id="manual-context"
            onChange={(event) => {
              handleManualContextChange(event.target.value);
            }}
            placeholder="Paste a ticket, issue, selected text, or notes here."
            value={manualContext}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="context-preview">
            Context preview
          </label>
          <textarea
            className="text-area context-preview"
            id="context-preview"
            readOnly
            value={contextPreview}
          />
        </div>

        {accessGate.kind === 'blocked' ? (
          <InlineMessage>
            {getAccessGateMessage(accessGate.reason)}
          </InlineMessage>
        ) : null}

        {contextValidationMessage ? (
          <InlineMessage tone="error">{contextValidationMessage}</InlineMessage>
        ) : null}

        {errorMessage ? (
          <InlineMessage tone="error">{errorMessage}</InlineMessage>
        ) : null}

        {copyStatus === 'success' ? (
          <InlineMessage tone="success">Markdown copied.</InlineMessage>
        ) : null}

        <div className="button-row">
          <button
            className="button button-primary"
            disabled={!canGenerate}
            onClick={() => {
              void handleGenerateClick();
            }}
            type="button"
          >
            {status === 'loading' ? 'Generating...' : 'Generate Brief'}
          </button>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="markdown-preview">
            Markdown preview
          </label>
          <textarea
            className="text-area markdown-preview"
            id="markdown-preview"
            placeholder="Generated markdown will appear here."
            readOnly
            value={result?.markdown ?? ''}
          />
        </div>

        <div className="status-row">
          <button
            className="button button-secondary"
            disabled={!result?.markdown || status === 'loading'}
            onClick={() => {
              void copyMarkdown();
            }}
            type="button"
          >
            Copy
          </button>
          <button
            className="button button-secondary"
            disabled={!result?.markdown || status === 'loading'}
            onClick={() => {
              if (result) {
                downloadMarkdown(result.title, result.markdown);
              }
            }}
            type="button"
          >
            Download .md
          </button>
        </div>
      </div>
    </section>
  );
}
