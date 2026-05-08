import { useEffect, useMemo, useState } from 'react';

import { useAccessStore } from '@/features/access/model/useAccessStore';
import { env } from '@/shared/config';
import {
  getLastTargetRole,
  getRecentContextPackOutputs,
  setLastTargetRole,
} from '@/shared/lib/contextPackStorage';
import {
  getAccessGate,
  getAccessGateMessage,
} from '@/shared/model/access';
import {
  DEFAULT_OUTPUT_TYPE,
  type ExtractedContext,
  type OutputType,
  type TargetRole,
  getContextValidationMessage,
  getDefaultOutputTypeForRole,
  getSourceTypeLabel,
  isOutputTypeValidForRole,
  outputTypeOptions,
  targetRoleOptions,
} from '@/shared/model/contextPack';
import { InlineMessage } from '@/shared/ui/InlineMessage';

import { extractCurrentTabContext } from '../lib/pageExtraction';
import { useGenerateBrief } from '../model/useGenerateBrief';

const manualContextTemplate: ExtractedContext = {
  comments: [],
  description: '',
  labels: [],
  sourceType: 'manual',
  title: 'Manual context',
};

function createManualContext(value: string): ExtractedContext {
  return {
    ...manualContextTemplate,
    description: value,
  };
}

function createMarkdownFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);

  return `${slug || 'contextpackai-brief'}.md`;
}

function downloadMarkdown(title: string, markdown: string) {
  const blob = new Blob([markdown], {
    type: 'text/markdown;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = createMarkdownFileName(title);
  anchor.click();
  URL.revokeObjectURL(url);
}

function getContextPreview(context: ExtractedContext): string {
  return [
    context.title ? `Title: ${context.title}` : null,
    context.status ? `Status: ${context.status}` : null,
    context.priority ? `Priority: ${context.priority}` : null,
    context.labels.length > 0 ? `Labels: ${context.labels.join(', ')}` : null,
    context.description ? `\n${context.description}` : null,
    context.comments.length > 0
      ? `\nComments:\n${context.comments.map((comment) => `- ${comment}`).join('\n')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export function ContextPackPopup() {
  const [context, setContext] =
    useState<ExtractedContext>(manualContextTemplate);
  const [manualContext, setManualContext] = useState('');
  const [targetRole, setTargetRole] = useState<TargetRole>('developer');
  const [outputType, setOutputType] =
    useState<OutputType>(DEFAULT_OUTPUT_TYPE);
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
    recentOutputs,
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

  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      getLastTargetRole(),
      getRecentContextPackOutputs(),
      extractCurrentTabContext(),
    ])
      .then(([storedRole, storedRecentOutputs, extractedContext]) => {
        if (cancelled) {
          return;
        }

        setTargetRole(storedRole);
        loadRecentOutputs(storedRecentOutputs);
        setContext(extractedContext);
        setManualContext(extractedContext.description ?? '');
        setExtractStatus('success');
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
  }, [loadRecentOutputs]);

  async function handleGenerateClick() {
    if (!canGenerate) {
      return;
    }

    await setLastTargetRole(targetRole);
    const access = await accessStore.prepareGenerationAccess();

    if (!access) {
      return;
    }

    const generationResult = await runGenerateBrief({
      access,
      payload: {
        context,
        credentialMode: access.kind === 'byok' ? 'byok' : 'subscription',
        model: access.kind === 'byok' ? access.model : undefined,
        options: {
          includeComments: true,
          includeLinkedItems: true,
          includeMissingInfo: true,
          includePromptForAI: true,
          includeQuestions: true,
          outputFormat: 'markdown',
          tone: 'detailed',
        },
        outputType,
        provider: access.kind === 'byok' ? access.provider : undefined,
        targetRole,
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
    setExtractStatus('loading');
    setExtractErrorMessage(null);

    try {
      const extractedContext = await extractCurrentTabContext();
      setContext(extractedContext);
      setManualContext(extractedContext.description ?? '');
      setExtractStatus('success');
    } catch {
      setExtractStatus('error');
      setExtractErrorMessage(
        'Unable to extract this page. Paste context manually.',
      );
    }
  }

  return (
    <section className="panel context-panel" aria-labelledby="context-pack-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="context-pack-title">
            ContextPackAI
          </h2>
          <p className="panel-subtitle">
            Turn the current work item into a role-specific markdown brief.
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
            <label className="field-label" htmlFor="target-role">
              Target role
            </label>
            <select
              className="select-input"
              disabled={status === 'loading'}
              id="target-role"
              onChange={(event) => {
                const nextRole = event.target.value as TargetRole;
                setTargetRole(nextRole);
                setOutputType(getDefaultOutputTypeForRole(nextRole));
                void setLastTargetRole(nextRole);
              }}
              value={targetRole}
            >
              {targetRoleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="output-type">
              Output type
            </label>
            <select
              className="select-input"
              disabled={status === 'loading'}
              id="output-type"
              onChange={(event) => {
                setOutputType(event.target.value as OutputType);
              }}
              value={outputType}
            >
              {outputTypeOptions
                .filter((option) => isOutputTypeValidForRole(targetRole, option.value))
                .map((option) => (
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

        {recentOutputs.length > 0 ? (
          <div className="recent-output-list" aria-label="Recent outputs">
            <h3 className="section-title">Recent outputs</h3>
            {recentOutputs.map((output) => (
              <button
                className="recent-output-button"
                key={output.id}
                onClick={() => {
                  void navigator.clipboard.writeText(output.markdown);
                }}
                type="button"
              >
                <span>{output.title}</span>
                <small>{output.sourceTitle}</small>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
