import { AccessPanel } from '@/features/access/ui/AccessPanel';

interface AccessSettingsPanelProps {
  onAccessConfigured: () => void;
}

export function AccessSettingsPanel({
  onAccessConfigured,
}: AccessSettingsPanelProps) {
  return <AccessPanel onAccessConfigured={onAccessConfigured} />;
}
