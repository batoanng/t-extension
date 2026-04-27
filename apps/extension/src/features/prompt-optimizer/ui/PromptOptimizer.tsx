import { useState } from 'react';

import { useAccessStore } from '@/features/access/model/useAccessStore';
import { env } from '@/shared/config';
import { getAccessGate, getAccessGateMessage } from '@/shared/model/access';
import {
  DEFAULT_PROMPT_PURPOSE,
  DEFAULT_MODE,
  DEFAULT_OUTPUT_STYLE,
  MAX_PROMPT_LENGTH,
  type PromptOutputStyle,
  type PromptPurpose,
  getPromptMetadataProviderLabel,
  getPromptValidationMessage,
  promptOutputStyleOptions,
  promptPurposeOptions,
} from '@/shared/model/prompt';
import { InlineMessage } from '@/shared/ui/InlineMessage';

import { useOptimizePrompt } from '../model/useOptimizePrompt';

export function PromptOptimizer() {
  const [rawPrompt, setRawPrompt] = useState('');
  const [purpose, setPurpose] =
    useState<PromptPurpose>(DEFAULT_PROMPT_PURPOSE);
  const [outputStyle, setOutputStyle] =
    useState<PromptOutputStyle>(DEFAULT_OUTPUT_STYLE);
  const [includeResponseFraming, setIncludeResponseFraming] = useState(false);
  const accessStore = useAccessStore();
  const {
    copyOptimizedPrompt,
    copyStatus,
    errorMessage,
    result,
    runOptimizePrompt,
    status,
  } = useOptimizePrompt();

  const promptValidationMessage = getPromptValidationMessage(rawPrompt);
  const accessGate = getAccessGate(accessStore);
  const canOptimize =
    accessStore.ready &&
    accessGate.kind === 'allowed' &&
    promptValidationMessage == null &&
    status !== 'loading';

  async function handleOptimizeClick() {
    if (!canOptimize) {
      return;
    }

    const access = await accessStore.prepareOptimizeAccess();

    if (!access) {
      return;
    }

    const optimizeResult = await runOptimizePrompt({
      access,
      payload: {
        credentialMode: access.kind === 'byok' ? 'byok' : 'subscription',
        includeResponseFraming,
        model: access.kind === 'byok' ? access.model : undefined,
        mode: DEFAULT_MODE,
        outputStyle,
        prompt: rawPrompt,
        provider: access.kind === 'byok' ? access.provider : undefined,
        purpose,
      },
      serverBaseUrl: env.serverBaseUrl,
    });

    if (optimizeResult.ok) {
      accessStore.clearAccessIssue();
      return;
    }

    accessStore.reportOptimizeFailure({
      accessKind: access.kind,
      errorCode: optimizeResult.errorCode,
    });
  }

  return (
    <section
      className="panel optimizer-panel"
      aria-labelledby="prompt-optimizer-title"
    >
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="prompt-optimizer-title">
            Prompt Optimizer
          </h2>
          <p className="panel-subtitle">
            Tighten the task, preserve intent, and make missing context explicit
            before handing work to any AI assistant.
          </p>
        </div>
      </div>

      <div className="stack">
        <div className="field">
          <label className="field-label" htmlFor="raw-prompt">
            Raw prompt
          </label>
          <textarea
            className="text-area optimizer-input"
            disabled={!accessStore.ready || status === 'loading'}
            id="raw-prompt"
            maxLength={MAX_PROMPT_LENGTH}
            onChange={(event) => {
              setRawPrompt(event.target.value);
            }}
            placeholder="Fix my React page. It feels slow and the state gets weird after saving."
            value={rawPrompt}
          />
          <div className="counter">
            {rawPrompt.trim().length} / {MAX_PROMPT_LENGTH}
          </div>
        </div>

        <div className="selector-grid">
          <div className="field">
            <label className="field-label" htmlFor="prompt-purpose">
              Purpose
            </label>
            <select
              className="select-input"
              disabled={status === 'loading'}
              id="prompt-purpose"
              onChange={(event) => {
                setPurpose(event.target.value as typeof purpose);
              }}
              value={purpose}
            >
              {promptPurposeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="output-style">
              Output style
            </label>
            <select
              className="select-input"
              disabled={status === 'loading'}
              id="output-style"
              onChange={(event) => {
                setOutputStyle(event.target.value as typeof outputStyle);
              }}
              value={outputStyle}
            >
              {promptOutputStyleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="checkbox-row" htmlFor="include-response-framing">
          <input
            checked={includeResponseFraming}
            disabled={status === 'loading'}
            id="include-response-framing"
            onChange={(event) => {
              setIncludeResponseFraming(event.target.checked);
            }}
            type="checkbox"
          />
          <span>Include Response Framing</span>
        </label>

        {accessGate.kind === 'blocked' ? (
          <InlineMessage>
            {getAccessGateMessage(accessGate.reason)}
          </InlineMessage>
        ) : null}

        {promptValidationMessage ? (
          <InlineMessage tone="error">{promptValidationMessage}</InlineMessage>
        ) : null}

        {errorMessage ? (
          <InlineMessage tone="error">{errorMessage}</InlineMessage>
        ) : null}

        {copyStatus === 'success' ? (
          <InlineMessage tone="success">Optimized prompt copied.</InlineMessage>
        ) : null}

        <div className="button-row">
          <button
            className="button button-primary"
            disabled={!canOptimize}
            onClick={handleOptimizeClick}
            type="button"
          >
            {status === 'loading' ? 'Optimizing...' : 'Optimize Prompt'}
          </button>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="optimized-prompt">
            Optimized prompt
          </label>
          <textarea
            className="text-area"
            id="optimized-prompt"
            placeholder="Your optimized prompt will appear here."
            readOnly
            value={result?.optimizedPrompt ?? ''}
          />
        </div>

        <div className="status-row">
          <button
            className="button button-secondary"
            disabled={!result?.optimizedPrompt || status === 'loading'}
            onClick={() => {
              void copyOptimizedPrompt();
            }}
            type="button"
          >
            Copy Optimized Prompt
          </button>
        </div>

        {result ? (
          <div className="meta-row" aria-label="Optimization metadata">
            <span className="meta-pill">{result.metadata.model}</span>
            <span className="meta-pill">
              {getPromptMetadataProviderLabel(result.metadata.provider)}
            </span>
            <span className="meta-pill">
              {
                promptPurposeOptions.find(
                  (option) => option.value === result.metadata.purpose,
                )?.label
              }
            </span>
            <span className="meta-pill">{result.metadata.outputStyle}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}
