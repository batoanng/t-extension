import { useEffect, useState } from 'react';

import { getRecentContextPackOutputs } from '@/shared/lib/contextPackStorage';
import type { RecentContextPackOutput } from '@/shared/model/contextPack';
import { InlineMessage } from '@/shared/ui/InlineMessage';

interface RecentPanelProps {
  onSelectOutput: (output: RecentContextPackOutput) => void;
}

function getOutputKindLabel(output: RecentContextPackOutput): string {
  return output.kind === 'capture' ? 'Capture' : 'Generate';
}

export function RecentPanel({ onSelectOutput }: RecentPanelProps) {
  const [recentOutputs, setRecentOutputs] = useState<RecentContextPackOutput[]>([]);

  useEffect(() => {
    let cancelled = false;

    void getRecentContextPackOutputs().then((outputs) => {
      if (!cancelled) {
        setRecentOutputs(outputs);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="panel recent-panel" aria-labelledby="recent-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="recent-title">
            Recent outputs
          </h2>
          <p className="panel-subtitle">
            Select a saved output to reopen it in its original workspace.
          </p>
        </div>
      </div>

      {recentOutputs.length > 0 ? (
        <div className="recent-output-list" aria-label="Recent outputs">
          {recentOutputs.map((output) => (
            <button
              className="recent-output-button"
              key={output.id}
              onClick={() => {
                onSelectOutput(output);
              }}
              type="button"
            >
              <span>{output.title}</span>
              <small>
                {getOutputKindLabel(output)} - {output.sourceTitle}
              </small>
            </button>
          ))}
        </div>
      ) : (
        <InlineMessage>
          Generated briefs and captured Markdown will appear here after your
          first successful run.
        </InlineMessage>
      )}
    </section>
  );
}
