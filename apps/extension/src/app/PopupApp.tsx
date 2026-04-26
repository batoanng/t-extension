import { useState } from 'react';

import { AccessPanel } from '@/features/access/ui/AccessPanel';
import { PromptOptimizer } from '@/features/prompt-optimizer/ui/PromptOptimizer';

export function PopupApp() {
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  return (
    <main className="popup-shell">
      <section className="app-frame">
        <header className="app-topbar">
          <p className="app-title">Developer Assistant</p>

          <div
            className="tooltip-anchor"
            onMouseEnter={() => {
              setIsInfoOpen(true);
            }}
            onMouseLeave={() => {
              setIsInfoOpen(false);
            }}
          >
            <button
              aria-describedby={isInfoOpen ? 'app-info-tooltip' : undefined}
              aria-expanded={isInfoOpen}
              aria-label="About Prompt Optimizer"
              className="icon-button info-button"
              onBlur={() => {
                setIsInfoOpen(false);
              }}
              onFocus={() => {
                setIsInfoOpen(true);
              }}
              type="button"
            >
              <span aria-hidden="true">i</span>
            </button>

            {isInfoOpen ? (
              <div
                className="info-tooltip"
                id="app-info-tooltip"
                role="tooltip"
              >
                <strong>Prompt Optimizer</strong>
                <p>
                  Rewrite rough engineering prompts into clearer instructions
                  for AI coding agents.
                </p>
              </div>
            ) : null}
          </div>
        </header>

        <AccessPanel />

        <PromptOptimizer />
      </section>
    </main>
  );
}
