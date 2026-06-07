import { ContextPackPopup } from '@/features/context-pack/ui/ContextPackPopup';
import type { RecentGenerationOutput } from '@/shared/model/contextPack';

interface GeneratePanelProps {
  extractionRequestId: number;
  restoredOutput?: RecentGenerationOutput | null;
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
