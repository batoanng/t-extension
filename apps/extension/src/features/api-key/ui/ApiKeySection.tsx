import { useState } from 'react';

import {
  CUSTOM_MODEL_OPTION_VALUE,
  getByokModelOptions,
  getByokProviderLabel,
  getByokProviderOptions,
  getProviderApiKeyHint,
  type StoredByokConfig,
} from '@/shared/model/access';
import { InlineMessage } from '@/shared/ui/InlineMessage';

interface ApiKeySectionProps {
  byokConfig: StoredByokConfig;
  isReady: boolean;
  onSaveByokConfig: (config: StoredByokConfig) => Promise<void>;
  onRemoveByokConfig: () => Promise<void>;
}

function createDraft(config: StoredByokConfig): StoredByokConfig {
  return {
    apiKey: config.apiKey,
    customModel: config.customModel,
    provider: config.provider,
    selectedModel: config.selectedModel,
  };
}

export function ApiKeySection({
  byokConfig,
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

  const hasApiKey = Boolean(byokConfig.apiKey);
  const showEditor = !hasApiKey || isEditing;
  const isCustomModel =
    draftConfig.selectedModel === CUSTOM_MODEL_OPTION_VALUE;
  const resolvedModel = isCustomModel
    ? draftConfig.customModel.trim()
    : draftConfig.selectedModel.trim();

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

    if (resolvedModel.length === 0) {
      setErrorMessage('Please choose a model.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onSaveByokConfig({
        apiKey: trimmedApiKey,
        customModel: draftConfig.customModel,
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

      {showEditor ? (
        <>
          <div className="selector-grid">
            <div className="field">
              <label className="field-label" htmlFor="byok-provider">
                Provider
              </label>
              <select
                className="select-input"
                disabled={!isReady || isSaving || isRemoving}
                id="byok-provider"
                onChange={(event) => {
                  const provider = event.target.value as StoredByokConfig['provider'];
                  const nextOptions = getByokModelOptions(provider);

                  setDraftConfig((current) => ({
                    ...current,
                    provider,
                    selectedModel: nextOptions[0]?.value ?? '',
                    customModel: '',
                  }));
                  setErrorMessage(null);
                }}
                value={draftConfig.provider}
              >
                {getByokProviderOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="byok-model">
                Model
              </label>
              <select
                className="select-input"
                disabled={!isReady || isSaving || isRemoving}
                id="byok-model"
                onChange={(event) => {
                  setDraftConfig((current) => ({
                    ...current,
                    selectedModel: event.target.value,
                  }));
                  setErrorMessage(null);
                }}
                value={draftConfig.selectedModel}
              >
                {getByokModelOptions(draftConfig.provider).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isCustomModel ? (
            <div className="field">
              <label className="field-label" htmlFor="custom-model-id">
                Custom model ID
              </label>
              <input
                autoComplete="off"
                className="text-input"
                disabled={!isReady || isSaving || isRemoving}
                id="custom-model-id"
                onChange={(event) => {
                  setDraftConfig((current) => ({
                    ...current,
                    customModel: event.target.value,
                  }));
                  setErrorMessage(null);
                }}
                placeholder="Enter a provider model ID"
                spellCheck={false}
                type="text"
                value={draftConfig.customModel}
              />
            </div>
          ) : null}

          <div className="field">
            <label className="field-label" htmlFor="byok-api-key">
              API key
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
              placeholder="Paste your API key"
              spellCheck={false}
              type="password"
              value={draftConfig.apiKey ?? ''}
            />
          </div>
        </>
      ) : (
        <>
          <div className="selector-grid">
            <div className="field">
              <span className="field-label">Provider</span>
              <div className="masked-value">
                {getByokProviderLabel(byokConfig.provider)}
              </div>
            </div>

            <div className="field">
              <span className="field-label">Model</span>
              <div className="masked-value">
                {byokConfig.selectedModel === CUSTOM_MODEL_OPTION_VALUE
                  ? byokConfig.customModel
                  : byokConfig.selectedModel}
              </div>
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
        <InlineMessage tone="success">Access settings saved locally.</InlineMessage>
      ) : null}

      <div className="button-row">
        {showEditor ? (
          <button
            className="button button-primary"
            disabled={
              !isReady ||
              isSaving ||
              isRemoving ||
              !draftConfig.apiKey?.trim() ||
              resolvedModel.length === 0
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
        is sent only with the current optimization request.
      </p>
    </div>
  );
}
