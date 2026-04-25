import { useState } from 'react';
import { env } from '@/shared/config';
import { getAccessGate } from '@/shared/model/access';
import {
  DEFAULT_MODE,
  DEFAULT_OUTPUT_STYLE,
  DEFAULT_TARGET_AGENT,
  MAX_PROMPT_LENGTH,
  type PromptOutputStyle,
  type PromptTargetAgent,
  getPromptValidationMessage,
  promptOutputStyleOptions,
  promptTargetAgentOptions,
} from '@/shared/model/prompt';
import { InlineMessage } from '@/shared/ui/InlineMessage';
import { useOptimizePrompt } from '../model/useOptimizePrompt';
import { useAccessStore } from '@/features/access/model/useAccessStore';

export function PromptOptimizer() {
  const [rawPrompt, setRawPrompt] = useState('');
  const [targetAgent, setTargetAgent] = useState<PromptTargetAgent>(
    DEFAULT_TARGET_AGENT,
  );
  const [outputStyle, setOutputStyle] = useState<PromptOutputStyle>(
    DEFAULT_OUTPUT_STYLE,
  );
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

    await runOptimizePrompt({
      access,
      payload: {
        credentialMode: access.kind === 'byok' ? 'byok' : 'subscription',
        mode: DEFAULT_MODE,
        outputStyle,
        prompt: rawPrompt,
        targetAgent,
      },
      serverBaseUrl: env.serverBaseUrl,
    });
  }

  return (
    <section className="panel" aria-labelledby="prompt-optimizer-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="prompt-optimizer-title">
            Prompt Optimizer
          </h2>
          <p className="panel-subtitle">
            Tighten the task, preserve intent, and make missing context explicit
            before handing work to an agent.
          </p>
        </div>
      </div>

      <div className="stack">
        <div className="field">
          <label className="field-label" htmlFor="raw-prompt">
            Raw prompt
          </label>
          <textarea
            className="text-area"
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
            <label className="field-label" htmlFor="target-agent">
              Target agent
            </label>
            <select
              className="select-input"
              disabled={status === 'loading'}
              id="target-agent"
              onChange={(event) => {
                setTargetAgent(event.target.value as typeof targetAgent);
              }}
              value={targetAgent}
            >
              {promptTargetAgentOptions.map((option) => (
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
            <span className="meta-pill">{result.metadata.provider}</span>
            <span className="meta-pill">{result.metadata.targetAgent}</span>
            <span className="meta-pill">{result.metadata.outputStyle}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function getAccessGateMessage(
  reason:
    | 'loading'
    | 'missing-api-key'
    | 'sign-in-required'
    | 'subscription-required'
    | 'subscription-loading'
    | 'offering-unavailable',
) {
  switch (reason) {
    case 'loading':
      return 'Preparing your optimization access...';
    case 'missing-api-key':
      return 'Add your OpenAI API key before optimizing prompts.';
    case 'sign-in-required':
      return 'Sign in to Developer Assistant Pro before using hosted optimization.';
    case 'subscription-required':
      return 'Subscribe to Developer Assistant Pro or switch back to your own API key.';
    case 'subscription-loading':
      return 'Checking your Developer Assistant Pro subscription...';
    case 'offering-unavailable':
      return 'Developer Assistant Pro is unavailable right now. You can still use your own API key.';
  }
}
