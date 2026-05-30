import { FileText, HeartHandshake, History, KeyRound } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AccessPanel } from '@/features/access/ui/AccessPanel';
import { useSavedApiKey } from '@/features/api-key/model/useSavedApiKey';
import { ContextPackPopup } from '@/features/context-pack/ui/ContextPackPopup';
import { AuthorSupportSection } from '@/features/support/ui/AuthorSupportSection';
import {
  CONTEXTPACK_ACTION_CLICKED_MESSAGE_TYPE,
  type ContextPackActionClickedMessage,
} from '@/shared/api';

type ActivePanel = 'generate' | 'access' | 'recent' | 'support';

const panelLabels: Record<ActivePanel, string> = {
  access: 'Access',
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
] satisfies Array<{
  icon: typeof FileText;
  id: ActivePanel;
  label: string;
}>;

export function PopupApp() {
  const { hasApiKey, isReady: isApiKeyReady } = useSavedApiKey();
  const hasResolvedInitialPanel = useRef(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>('access');
  const [extractionRequestId, setExtractionRequestId] = useState(0);

  useEffect(() => {
    if (!isApiKeyReady || hasResolvedInitialPanel.current) {
      return;
    }

    setActivePanel(hasApiKey ? 'generate' : 'access');
    hasResolvedInitialPanel.current = true;
  }, [hasApiKey, isApiKeyReady]);

  function selectPanel(panel: ActivePanel) {
    hasResolvedInitialPanel.current = true;
    setActivePanel(panel);
  }

  const openGenerateAndExtract = useCallback(() => {
    hasResolvedInitialPanel.current = true;
    setActivePanel('generate');
    setExtractionRequestId((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!globalThis.chrome?.runtime?.onMessage) {
      return undefined;
    }

    const handleMessage: Parameters<
      typeof chrome.runtime.onMessage.addListener
    >[0] = (message) => {
      const typedMessage = message as
        | ContextPackActionClickedMessage
        | undefined;

      if (typedMessage?.type !== CONTEXTPACK_ACTION_CLICKED_MESSAGE_TYPE) {
        return false;
      }

      if (hasApiKey) {
        openGenerateAndExtract();
      } else {
        hasResolvedInitialPanel.current = true;
        setActivePanel('access');
      }

      return false;
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, [hasApiKey, openGenerateAndExtract]);

  return (
    <main className="popup-shell">
      <section className="app-frame" aria-label="ContextPackAI side panel">
        <div className="panel-layout">
          <div className="panel-content">
            {activePanel === 'generate' || activePanel === 'recent' ? (
              <ContextPackPopup
                activePanel={activePanel}
                extractionRequestId={extractionRequestId}
              />
            ) : null}

            {activePanel === 'access' ? (
              <AccessPanel onAccessConfigured={openGenerateAndExtract} />
            ) : null}

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
                    selectPanel(item.id);
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
