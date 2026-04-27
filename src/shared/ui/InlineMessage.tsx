import type { ReactNode } from 'react';

interface InlineMessageProps {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'error';
}

export function InlineMessage({
  children,
  tone = 'neutral',
}: InlineMessageProps) {
  return (
    <div className="inline-message" data-tone={tone} role="status">
      {children}
    </div>
  );
}
