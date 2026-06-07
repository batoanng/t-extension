import {
  FileText,
  HeartHandshake,
  History,
  KeyRound,
  ScanText,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useSavedApiKey } from '@/features/api-key/model/useSavedApiKey';
import {
  CONTEXTPACK_ACTION_CLICKED_MESSAGE_TYPE,
  type ContextPackActionClickedMessage,
} from '@/shared/api';
import type {
  RecentCaptureOutput,
  RecentContextPackOutput,
  RecentGenerationOutput,
} from '@/shared/model/contextPack';

import { ActivePanelContent, type ActivePanel } from './panels';
import { AppQueryProvider } from './queryClient';

const panelLabels: Record<ActivePanel, string> = {
  access: 'Access',
  capture: 'Capture',
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
    icon: ScanText,
    id: 'capture',
    label: panelLabels.capture,
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
  return (
    <AppQueryProvider>
      <PopupAppContent />
    </AppQueryProvider>
  );
}

function PopupAppContent() {
  const { hasApiKey, isReady: isApiKeyReady } = useSavedApiKey();
  const hasResolvedInitialPanel = useRef(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>('access');
  const [extractionRequestId, setExtractionRequestId] = useState(0);
  const [restoredCaptureOutput, setRestoredCaptureOutput] =
    useState<RecentCaptureOutput | null>(null);
  const [restoredGenerationOutput, setRestoredGenerationOutput] =
    useState<RecentGenerationOutput | null>(null);

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

  function handleRecentOutputSelected(output: RecentContextPackOutput) {
    hasResolvedInitialPanel.current = true;

    if (output.kind === 'capture') {
      setRestoredCaptureOutput(output);
      setRestoredGenerationOutput(null);
      setActivePanel('capture');
      return;
    }

    setRestoredGenerationOutput(output);
    setRestoredCaptureOutput(null);
    setActivePanel('generate');
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
            <ActivePanelContent
              activePanel={activePanel}
              extractionRequestId={extractionRequestId}
              onAccessConfigured={openGenerateAndExtract}
              onRecentOutputSelected={handleRecentOutputSelected}
              restoredCaptureOutput={restoredCaptureOutput}
              restoredGenerationOutput={restoredGenerationOutput}
            />
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
