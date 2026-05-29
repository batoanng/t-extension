import {
  CircleHelp,
  FileText,
  HeartHandshake,
  History,
  KeyRound,
} from 'lucide-react';
import { useState } from 'react';

import { AccessPanel } from '@/features/access/ui/AccessPanel';
import { ContextPackPopup } from '@/features/context-pack/ui/ContextPackPopup';
import { AuthorSupportSection } from '@/features/support/ui/AuthorSupportSection';

type ActivePanel = 'generate' | 'access' | 'recent' | 'support' | 'about';

const panelLabels: Record<ActivePanel, string> = {
  access: 'Access',
  about: 'About',
  generate: 'Generate',
  recent: 'Recent',
  support: 'Support',
};

const railItems = [
  {
    icon: FileText,
    id: 'generate',
    label: panelLabels.generate,
  },
  {
    icon: KeyRound,
    id: 'access',
    label: panelLabels.access,
  },
  {
    icon: History,
    id: 'recent',
    label: panelLabels.recent,
  },
  {
    icon: HeartHandshake,
    id: 'support',
    label: panelLabels.support,
  },
  {
    icon: CircleHelp,
    id: 'about',
    label: panelLabels.about,
  },
] satisfies Array<{
  icon: typeof FileText;
  id: ActivePanel;
  label: string;
}>;

export function PopupApp() {
  const [activePanel, setActivePanel] = useState<ActivePanel>('generate');

  return (
    <main className="popup-shell">
      <section className="app-frame" aria-label="ContextPackAI side panel">
        <div className="panel-layout">
          <div className="panel-content">
            {activePanel === 'generate' || activePanel === 'recent' ? (
              <ContextPackPopup activePanel={activePanel} />
            ) : null}

            {activePanel === 'access' ? <AccessPanel /> : null}

            {activePanel === 'support' ? (
              <section
                className="panel support-panel"
                aria-labelledby="support-title"
              >
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title" id="support-title">
                      Support
                    </h2>
                    <p className="panel-subtitle">
                      Keep ContextPackAI useful and easy to maintain.
                    </p>
                  </div>
                </div>
                <AuthorSupportSection />
              </section>
            ) : null}

            {activePanel === 'about' ? (
              <section
                className="panel about-panel"
                aria-labelledby="about-title"
              >
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title" id="about-title">
                      About ContextPackAI
                    </h2>
                    <p className="panel-subtitle">
                      Convert Jira, Linear, GitHub issues, and selected text
                      into role-specific markdown briefs.
                    </p>
                  </div>
                </div>
                <div className="about-grid">
                  <div className="about-stat">
                    <span>Input</span>
                    <strong>Browser context</strong>
                  </div>
                  <div className="about-stat">
                    <span>Output</span>
                    <strong>Markdown brief</strong>
                  </div>
                  <div className="about-stat">
                    <span>Access</span>
                    <strong>BYOK or shared</strong>
                  </div>
                </div>
              </section>
            ) : null}
          </div>

          <nav className="rail-nav" aria-label="ContextPackAI sections">
            {railItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activePanel;

              return (
                <button
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  className={`rail-button${isActive ? ' is-active' : ''}`}
                  key={item.id}
                  onClick={() => {
                    setActivePanel(item.id);
                  }}
                  title={item.label}
                  type="button"
                >
                  <Icon size={21} strokeWidth={2.1} />
                </button>
              );
            })}
          </nav>
        </div>
      </section>
    </main>
  );
}
