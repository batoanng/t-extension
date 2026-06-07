import { AccessSettingsPanel } from './AccessSettingsPanel';
import { CaptureMarkdownPanel } from './CaptureMarkdownPanel';
import { GeneratePanel } from './GeneratePanel';
import { RecentPanel } from './RecentPanel';
import { SupportPanel } from './SupportPanel';
import type { ActivePanel } from './types';
import type {
  RecentCaptureOutput,
  RecentContextPackOutput,
  RecentGenerationOutput,
} from '@/shared/model/contextPack';

interface ActivePanelContentProps {
  activePanel: ActivePanel;
  extractionRequestId: number;
  onAccessConfigured: () => void;
  onRecentOutputSelected: (output: RecentContextPackOutput) => void;
  restoredCaptureOutput?: RecentCaptureOutput | null;
  restoredGenerationOutput?: RecentGenerationOutput | null;
}

export function ActivePanelContent({
  activePanel,
  extractionRequestId,
  onAccessConfigured,
  onRecentOutputSelected,
  restoredCaptureOutput = null,
  restoredGenerationOutput = null,
}: ActivePanelContentProps) {
  switch (activePanel) {
    case 'generate':
      return (
        <GeneratePanel
          extractionRequestId={extractionRequestId}
          restoredOutput={restoredGenerationOutput}
        />
      );
    case 'capture':
      return <CaptureMarkdownPanel restoredOutput={restoredCaptureOutput} />;
    case 'access':
      return <AccessSettingsPanel onAccessConfigured={onAccessConfigured} />;
    case 'recent':
      return <RecentPanel onSelectOutput={onRecentOutputSelected} />;
    case 'support':
      return <SupportPanel />;
  }
}
