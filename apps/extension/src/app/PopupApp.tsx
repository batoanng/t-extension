import { ApiKeySection } from '@/features/api-key/ui/ApiKeySection';
import { useSavedApiKey } from '@/features/api-key/model/useSavedApiKey';
import { PromptOptimizer } from '@/features/prompt-optimizer/ui/PromptOptimizer';

export function PopupApp() {
  const {
    apiKey,
    hasApiKey,
    isReady,
    removeApiKey,
    saveApiKey,
  } = useSavedApiKey();

  return (
    <main className="popup-shell">
      <section className="app-frame">
        <header className="hero-card">
          <p className="eyebrow">Developer Assistant</p>
          <h1>Prompt Optimizer</h1>
          <p className="hero-copy">
            Rewrite rough engineering prompts into clearer instructions for AI
            coding agents.
          </p>
        </header>

        <ApiKeySection
          hasApiKey={hasApiKey}
          isReady={isReady}
          onRemoveApiKey={removeApiKey}
          onSaveApiKey={saveApiKey}
        />

        <PromptOptimizer
          apiKey={apiKey}
          hasApiKey={hasApiKey}
          isStorageReady={isReady}
        />
      </section>
    </main>
  );
}
