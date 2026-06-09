import { Camera, Copy, Download, ExternalLink, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAccessStore } from '@/features/access/model/useAccessStore';
import { useCaptureMarkdown } from '@/features/capture/model/useCaptureMarkdown';
import { useAgents } from '@/shared/api';
import { env } from '@/shared/config';
import {
  getLastAgentType,
  setLastAgentType,
} from '@/shared/lib/contextPackStorage';
import { downloadMarkdown } from '@/shared/lib/markdownDownload';
import { openExternalUrl } from '@/shared/lib/openExternalUrl';
import {
  getAccessGate,
  getAccessGateMessage,
  isAccessGateErrorReason,
} from '@/shared/model/access';
import {
  type AgentType,
  DEFAULT_AGENT_TYPE,
  type RecentContextPackOutput,
  createManualExtractedContext,
  getContextPlainText,
  getContextValidationMessage,
} from '@/shared/model/contextPack';
import {
  type ExtractionMimeType,
  extractionMimeTypes,
} from '@/shared/model/extraction';
import { InlineMessage } from '@/shared/ui/InlineMessage';

import { extractCurrentTabContext } from '../lib/pageExtraction';
import { useGenerateBrief } from '../model/useGenerateBrief';

function isSupportedMimeType(value: string): value is ExtractionMimeType {
  return extractionMimeTypes.includes(value as ExtractionMimeType);
}

function getDataUrlPayload(dataUrl: string) {
  const match = /^data:([^;,]+);base64,(.+)$/u.exec(dataUrl);

  if (!match) {
    return null;
  }

  return {
    dataBase64: match[2],
    mimeType: match[1],
  };
}

function appendMarkdown(currentText: string, markdown: string): string {
  const trimmedCurrentText = currentText.trim();
  const trimmedMarkdown = markdown.trim();

  if (!trimmedCurrentText) {
    return trimmedMarkdown;
  }

  return `${trimmedCurrentText}\n\n${trimmedMarkdown}`;
}

interface ContextPackPopupProps {
  activePanel: 'generate';
  extractionRequestId?: number;
  restoredOutput?: RecentContextPackOutput | null;
}

export function ContextPackPopup({
  activePanel,
  extractionRequestId = 0,
  restoredOutput = null,
}: ContextPackPopupProps) {
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
    agentOptions,
    isLoading: agentsLoading,
    isResolved: agentsResolved,
  } = useAgents();
  const {
    copyMarkdown,
    copyStatus,
    clearResult,
    errorMessage,
    restoreGenerationOutput,
    result,
    runGenerateBrief,
    status,
  } = useGenerateBrief();
  const {
    errorMessage: captureErrorMessage,
    result: captureResult,
    runCaptureMarkdown,
    setCaptureError,
    status: captureStatus,
  } = useCaptureMarkdown();
  const accessGate = getAccessGate(accessStore);
  const context = useMemo(
    () => createManualExtractedContext({ text: manualContext }),
    [manualContext],
  );
  const contextValidationMessage = getContextValidationMessage(context);
  const canGenerate =
    accessStore.ready &&
    accessGate.kind === 'allowed' &&
    contextValidationMessage == null &&
    status !== 'loading';
  const canCapture =
    accessStore.ready &&
    accessGate.kind === 'allowed' &&
    captureStatus !== 'loading' &&
    status !== 'loading';
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

      setManualContext(getContextPlainText(extractedContext));
      setExtractStatus('success');
    } catch {
      if (!isMounted.current) {
        return;
      }

      setExtractStatus('error');
      setExtractErrorMessage(
        'Unable to extract this page. Paste or capture context manually.',
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([getLastAgentType(), refreshContext()])
      .then(([storedAgentType]) => {
        if (cancelled) {
          return;
        }

        setAgentType(storedAgentType);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setExtractStatus('error');
        setExtractErrorMessage(
          'Unable to extract this page. Paste or capture context manually.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [refreshContext]);

  useEffect(() => {
    if (!restoredOutput) {
      return;
    }

    setExtractStatus('success');
    setExtractErrorMessage(null);

    if (restoredOutput.kind === 'generation') {
      setAgentType(restoredOutput.agentType);
      setManualContext(getContextPlainText(restoredOutput.context));
      restoreGenerationOutput(restoredOutput);
      void setLastAgentType(restoredOutput.agentType);
      return;
    }

    setManualContext(restoredOutput.markdown);
    clearResult();
  }, [clearResult, restoreGenerationOutput, restoredOutput]);

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
  }

  function handleViewAgentDetails() {
    openExternalUrl(`${env.webBaseUrl}/agents/${agentType}`);
  }

  async function handleRefreshContextClick() {
    await refreshContext();
  }

  async function handleCaptureVisibleTab() {
    if (!canCapture) {
      return;
    }

    if (!globalThis.chrome?.tabs?.captureVisibleTab) {
      setCaptureError('Visible tab capture is available only inside Chrome.');
      return;
    }

    const access = await accessStore.prepareGenerationAccess();

    if (!access) {
      return;
    }

    try {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const dataUrl = await chrome.tabs.captureVisibleTab(activeTab?.windowId, {
        format: 'png',
      });
      const payload = getDataUrlPayload(dataUrl);

      if (!payload || !isSupportedMimeType(payload.mimeType)) {
        setCaptureError('Chrome returned an unsupported screenshot format.');
        return;
      }

      const extractionResult = await runCaptureMarkdown({
        access,
        payload: {
          dataBase64: payload.dataBase64,
          filename: 'visible-tab.png',
          mimeType: payload.mimeType,
          source: {
            title: activeTab?.title ?? 'Visible tab capture',
            type: 'visible_tab',
            url: activeTab?.url,
          },
        },
      });

      if (extractionResult) {
        setManualContext((currentText) =>
          appendMarkdown(currentText, extractionResult.markdown),
        );
      }
    } catch {
      setCaptureError(
        'Unable to capture the visible tab. Reopen the side panel from the extension button and try again.',
      );
    }
  }

  return (
    <section
      className="panel context-panel"
      aria-labelledby="context-pack-title"
    >
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="context-pack-title">
            OneAgent
          </h2>
          <p className="panel-subtitle">
            Paste, type, or capture content, then turn it into an agent-specific
            Markdown brief.
          </p>
        </div>
      </div>

      <div className="stack">
        <div className="detected-row">
          <button
            className="button button-secondary compact-button"
            disabled={extractStatus === 'loading'}
            onClick={() => {
              void handleRefreshContextClick();
            }}
            type="button"
          >
            <RefreshCw size={15} strokeWidth={2.2} />
            New session
          </button>
          <button
            className="button button-secondary compact-button"
            disabled={!canCapture}
            onClick={() => {
              void handleCaptureVisibleTab();
            }}
            type="button"
          >
            <Camera size={15} strokeWidth={2.2} />
            {captureStatus === 'loading' ? 'Capturing...' : 'Capture screen'}
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
            <div className="agent-selector-row">
              <select
                className="select-input"
                disabled={status === 'loading' || agentOptions.length === 0}
                id="agent-type"
                onChange={(event) => {
                  const nextAgentType = event.target.value as AgentType;
                  setAgentType(nextAgentType);
                  void setLastAgentType(nextAgentType);
                }}
                value={agentType}
              >
                {agentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                className="button button-secondary compact-button"
                onClick={handleViewAgentDetails}
                title="View agent details in the OneAgent web app"
                type="button"
              >
                View agent details
                <ExternalLink size={14} strokeWidth={2.2} />
              </button>
            </div>
            {agentsLoading && !agentsResolved ? (
              <span className="field-hint">Loading agents…</span>
            ) : null}
            {agentOptions.length === 0 ? (
              <span className="field-hint">No agents available.</span>
            ) : null}
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="manual-context">
            Content
          </label>
          <textarea
            className="text-area manual-context-input"
            disabled={status === 'loading'}
            id="manual-context"
            onChange={(event) => {
              handleManualContextChange(event.target.value);
            }}
            placeholder="Paste, type, or capture a ticket, issue, selected text, notes, or extracted Markdown here."
            value={manualContext}
          />
        </div>

        {captureErrorMessage ? (
          <InlineMessage tone="error">{captureErrorMessage}</InlineMessage>
        ) : null}

        {captureResult?.warnings.length ? (
          <InlineMessage>{captureResult.warnings.join(' ')}</InlineMessage>
        ) : null}

        {accessGate.kind === 'blocked' ? (
          <InlineMessage
            tone={
              isAccessGateErrorReason(accessGate.reason) ? 'error' : undefined
            }
          >
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
            <Copy size={16} strokeWidth={2.2} />
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
            <Download size={16} strokeWidth={2.2} />
            Download .md
          </button>
        </div>
      </div>
    </section>
  );
}
