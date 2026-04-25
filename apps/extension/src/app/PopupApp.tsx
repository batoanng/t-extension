import { AccessPanel } from '@/features/access/ui/AccessPanel';
import { PromptOptimizer } from '@/features/prompt-optimizer/ui/PromptOptimizer';

export function PopupApp() {
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

        <AccessPanel />

        <PromptOptimizer />
      </section>
    </main>
  );
}
