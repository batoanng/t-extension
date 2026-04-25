import { useState } from 'react';
import { InlineMessage } from '@/shared/ui/InlineMessage';

interface ApiKeySectionProps {
  hasApiKey: boolean;
  isReady: boolean;
  onSaveApiKey: (apiKey: string) => Promise<void>;
  onRemoveApiKey: () => Promise<void>;
}

function isLikelyOpenAiKey(apiKey: string): boolean {
  return apiKey.startsWith('sk-');
}

export function ApiKeySection({
  hasApiKey,
  isReady,
  onSaveApiKey,
  onRemoveApiKey,
}: ApiKeySectionProps) {
  const [draftApiKey, setDraftApiKey] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(hasApiKey);

  const showEditor = !hasApiKey || isEditing;

  async function handleSaveClick() {
    const trimmedApiKey = draftApiKey.trim();

    if (trimmedApiKey.length === 0) {
      setErrorMessage('Please enter your OpenAI API key.');
      return;
    }

    if (!isLikelyOpenAiKey(trimmedApiKey)) {
      setErrorMessage('OpenAI API keys usually start with `sk-`.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onSaveApiKey(trimmedApiKey);
      setDraftApiKey('');
      setIsEditing(false);
      setShowSavedMessage(true);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveClick() {
    setIsRemoving(true);
    setErrorMessage(null);

    try {
      await onRemoveApiKey();
      setShowSavedMessage(false);
      setIsEditing(false);
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <section className="panel" aria-labelledby="api-key-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="api-key-title">
            OpenAI API Key
          </h2>
          <p className="panel-subtitle">
            Your key is stored locally and only sent to the configured backend
            when you optimize a prompt.
          </p>
        </div>
      </div>

      <div className="stack">
        {!isReady ? (
          <InlineMessage>Loading saved API key...</InlineMessage>
        ) : null}

        {showEditor ? (
          <div className="field">
            <label className="field-label" htmlFor="openai-api-key">
              API key
            </label>
            <input
              autoComplete="off"
              className="text-input"
              disabled={!isReady || isSaving || isRemoving}
              id="openai-api-key"
              onChange={(event) => {
                setDraftApiKey(event.target.value);
                setErrorMessage(null);
              }}
              placeholder="sk-..."
              spellCheck={false}
              type="password"
              value={draftApiKey}
            />
          </div>
        ) : (
          <div className="field">
            <span className="field-label">Saved key</span>
            <div className="masked-value" aria-label="Saved API key is masked">
              ••••••••••••••••••••••••
            </div>
          </div>
        )}

        {errorMessage ? (
          <InlineMessage tone="error">{errorMessage}</InlineMessage>
        ) : null}

        {hasApiKey && showSavedMessage && !isEditing ? (
          <InlineMessage tone="success">API key saved locally.</InlineMessage>
        ) : null}

        <div className="button-row">
          {showEditor ? (
            <button
              className="button button-primary"
              disabled={
                !isReady ||
                isSaving ||
                isRemoving ||
                draftApiKey.trim().length === 0
              }
              onClick={handleSaveClick}
              type="button"
            >
              {isSaving ? 'Saving...' : hasApiKey ? 'Save replacement' : 'Save'}
            </button>
          ) : (
            <button
              className="button button-secondary"
              disabled={!isReady || isRemoving}
              onClick={() => {
                setIsEditing(true);
                setShowSavedMessage(false);
              }}
              type="button"
            >
              Replace API key
            </button>
          )}

          {hasApiKey ? (
            <button
              className="button button-ghost"
              disabled={!isReady || isRemoving || isSaving}
              onClick={handleRemoveClick}
              type="button"
            >
              {isRemoving ? 'Removing...' : 'Remove key'}
            </button>
          ) : null}
        </div>

        <p className="hint-text">
          The backend uses your key for the current optimization request and
          does not store it.
        </p>
      </div>
    </section>
  );
}
