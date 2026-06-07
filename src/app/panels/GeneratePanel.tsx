import { ContextPackPopup } from '@/features/context-pack/ui/ContextPackPopup';
import type { RecentContextPackOutput } from '@/shared/model/contextPack';

interface GeneratePanelProps {
  extractionRequestId: number;
  restoredOutput?: RecentContextPackOutput | null;
}

export function GeneratePanel({
  extractionRequestId,
  restoredOutput = null,
}: GeneratePanelProps) {
  return (
    <ContextPackPopup
      activePanel="generate"
      extractionRequestId={extractionRequestId}
      restoredOutput={restoredOutput}
    />
  );
}
