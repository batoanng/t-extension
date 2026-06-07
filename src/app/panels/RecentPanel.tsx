import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';

import {
  getRecentContextPackOutputs,
  removeRecentContextPackOutput,
} from '@/shared/lib/contextPackStorage';
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
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(
    null,
  );

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

  async function handleDeleteOutput(outputId: string) {
    try {
      const nextOutputs = await removeRecentContextPackOutput(outputId);
      setRecentOutputs(nextOutputs);
      setDeleteErrorMessage(null);
    } catch {
      setDeleteErrorMessage('Unable to delete this output.');
    }
  }

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

      {deleteErrorMessage ? (
        <InlineMessage tone="error">{deleteErrorMessage}</InlineMessage>
      ) : null}

      {recentOutputs.length > 0 ? (
        <div className="recent-output-list" aria-label="Recent outputs">
          {recentOutputs.map((output) => (
            <div className="recent-output-row" key={output.id}>
              <button
                className="recent-output-button"
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
              <button
                aria-label={`Delete ${output.title}`}
                className="icon-button recent-delete-button"
                onClick={() => {
                  void handleDeleteOutput(output.id);
                }}
                title="Delete output"
                type="button"
              >
                <Trash2 size={16} strokeWidth={2.2} />
              </button>
            </div>
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
