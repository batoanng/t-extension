import { ContextPackPopup } from '@/features/context-pack/ui/ContextPackPopup';

interface GeneratePanelProps {
  extractionRequestId: number;
}

export function GeneratePanel({ extractionRequestId }: GeneratePanelProps) {
  return (
    <ContextPackPopup
      activePanel="generate"
      extractionRequestId={extractionRequestId}
    />
  );
}
