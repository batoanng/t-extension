import { AccessSettingsPanel } from './AccessSettingsPanel';
import { GeneratePanel } from './GeneratePanel';
import { RecentPanel } from './RecentPanel';
import { SequencePanel } from './SequencePanel';
import { SupportPanel } from './SupportPanel';
import { VisualizePanel } from './VisualizePanel';
import type { ActivePanel } from './types';
import type { RecentContextPackOutput } from '@/shared/model/contextPack';

interface ActivePanelContentProps {
  activePanel: ActivePanel;
  extractionRequestId: number;
  onAccessConfigured: () => void;
  onRecentOutputSelected: (output: RecentContextPackOutput) => void;
  restoredOutput?: RecentContextPackOutput | null;
}

export function ActivePanelContent({
  activePanel,
  extractionRequestId,
  onAccessConfigured,
  onRecentOutputSelected,
  restoredOutput = null,
}: ActivePanelContentProps) {
  switch (activePanel) {
    case 'generate':
      return (
        <GeneratePanel
          extractionRequestId={extractionRequestId}
          restoredOutput={restoredOutput}
        />
      );
    case 'visualize':
      return <VisualizePanel />;
    case 'sequence':
      return <SequencePanel />;
    case 'access':
      return <AccessSettingsPanel onAccessConfigured={onAccessConfigured} />;
    case 'recent':
      return <RecentPanel onSelectOutput={onRecentOutputSelected} />;
    case 'support':
      return <SupportPanel />;
  }
}
