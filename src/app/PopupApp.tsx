import { useState } from 'react';

import { AccessPanel } from '@/features/access/ui/AccessPanel';
import { ContextPackPopup } from '@/features/context-pack/ui/ContextPackPopup';
import { AuthorSupportSection } from '@/features/support/ui/AuthorSupportSection';

export function PopupApp() {
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  return (
    <main className="popup-shell">
      <section className="app-frame">
        <header className="app-topbar">
          <p className="app-title">ContextPackAI</p>

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
              aria-label="About ContextPackAI"
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
                <strong>ContextPackAI</strong>
                <p>
                  Convert Jira, Linear, GitHub issues, and selected text into
                  role-specific markdown briefs.
                </p>
              </div>
            ) : null}
          </div>
        </header>

        <AccessPanel />

        <ContextPackPopup />

        <AuthorSupportSection />
      </section>
    </main>
  );
}
