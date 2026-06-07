import { useEffect, useState } from 'react';

import {
  getByokProviderLabel,
  getProviderApiKeyHint,
  type StoredByokConfig,
} from '@/shared/model/access';
import { InlineMessage } from '@/shared/ui/InlineMessage';

interface ApiKeySectionProps {
  byokConfig: StoredByokConfig;
  catalogStatus: 'idle' | 'loading' | 'ready' | 'error';
  isReady: boolean;
  onSaveByokConfig: (config: StoredByokConfig) => Promise<void>;
  onRemoveByokConfig: () => Promise<void>;
}

function createDraft(config: StoredByokConfig): StoredByokConfig {
  return {
    apiKey: config.apiKey,
    provider: config.provider,
    selectedModel: config.selectedModel,
  };
}

export function ApiKeySection({
  byokConfig,
  catalogStatus,
  isReady,
  onSaveByokConfig,
  onRemoveByokConfig,
}: ApiKeySectionProps) {
  const [draftConfig, setDraftConfig] = useState<StoredByokConfig>(() =>
    createDraft(byokConfig),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraftConfig(createDraft(byokConfig));
    }
  }, [byokConfig, isEditing]);

  const hasApiKey = Boolean(byokConfig.apiKey);
  const showEditor = !hasApiKey || isEditing;
  function resetDraft(config: StoredByokConfig) {
    setDraftConfig(createDraft(config));
    setErrorMessage(null);
  }

  async function handleSaveClick() {
    const trimmedApiKey = draftConfig.apiKey?.trim() || '';

    if (trimmedApiKey.length === 0) {
      setErrorMessage('Please enter an API key.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onSaveByokConfig({
        apiKey: trimmedApiKey,
        provider: draftConfig.provider,
        selectedModel: draftConfig.selectedModel,
      });
      setDraftConfig((current) => ({
        ...current,
        apiKey: trimmedApiKey,
      }));
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
      await onRemoveByokConfig();
      setDraftConfig((current) => ({
        ...current,
        apiKey: null,
      }));
      setShowSavedMessage(false);
      setIsEditing(false);
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <div className="stack">
      {!isReady ? (
        <InlineMessage>Loading saved access settings...</InlineMessage>
      ) : null}

      {catalogStatus === 'loading' ? (
        <InlineMessage>Loading the latest provider catalog...</InlineMessage>
      ) : null}

      {showEditor ? (
        <div className="field">
          <label className="field-label" htmlFor="byok-api-key">
            OpenRouter API key
          </label>
          <input
            autoComplete="off"
            className="text-input"
            disabled={!isReady || isSaving || isRemoving}
            id="byok-api-key"
            onChange={(event) => {
              setDraftConfig((current) => ({
                ...current,
                apiKey: event.target.value,
              }));
              setErrorMessage(null);
            }}
            placeholder="Paste your OpenRouter API key"
            spellCheck={false}
            type="password"
            value={draftConfig.apiKey ?? ''}
          />
        </div>
      ) : (
        <>
          <div className="field">
            <span className="field-label">Provider</span>
            <div className="masked-value">
              {getByokProviderLabel(byokConfig.provider)}
            </div>
          </div>

          <div className="field">
            <span className="field-label">Saved key</span>
            <div className="masked-value" aria-label="Saved API key is masked">
              ••••••••••••••••••••••••
            </div>
          </div>
        </>
      )}

      {errorMessage ? (
        <InlineMessage tone="error">{errorMessage}</InlineMessage>
      ) : null}

      {hasApiKey && showSavedMessage && !isEditing ? (
        <InlineMessage tone="success">
          Access settings saved locally.
        </InlineMessage>
      ) : null}

      <div className="button-row">
        {showEditor ? (
          <button
            className="button button-primary"
            disabled={
              !isReady ||
              isSaving ||
              isRemoving ||
              !draftConfig.apiKey?.trim()
            }
            onClick={handleSaveClick}
            type="button"
          >
            {isSaving
              ? 'Saving...'
              : hasApiKey
                ? 'Save replacement'
                : 'Save'}
          </button>
        ) : (
          <button
            className="button button-secondary"
            disabled={!isReady || isRemoving}
            onClick={() => {
              resetDraft(byokConfig);
              setIsEditing(true);
              setShowSavedMessage(false);
            }}
            type="button"
          >
            Replace access settings
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
        {getProviderApiKeyHint(draftConfig.provider)} Your key stays local and
        is sent only with the current generation request.
      </p>
    </div>
  );
}
