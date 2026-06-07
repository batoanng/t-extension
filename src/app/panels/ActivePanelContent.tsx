import { AccessSettingsPanel } from './AccessSettingsPanel';
import { CaptureMarkdownPanel } from './CaptureMarkdownPanel';
import { GeneratePanel } from './GeneratePanel';
import { RecentPanel } from './RecentPanel';
import { SupportPanel } from './SupportPanel';
import type { ActivePanel } from './types';

interface ActivePanelContentProps {
  activePanel: ActivePanel;
  extractionRequestId: number;
  onAccessConfigured: () => void;
}

export function ActivePanelContent({
  activePanel,
  extractionRequestId,
  onAccessConfigured,
}: ActivePanelContentProps) {
  switch (activePanel) {
    case 'generate':
      return <GeneratePanel extractionRequestId={extractionRequestId} />;
    case 'capture':
      return <CaptureMarkdownPanel />;
    case 'access':
      return <AccessSettingsPanel onAccessConfigured={onAccessConfigured} />;
    case 'recent':
      return <RecentPanel />;
    case 'support':
      return <SupportPanel />;
  }
}
