import { ArrowDown, ArrowUp, Play } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useAccessStore } from '@/features/access/model/useAccessStore';
import { generateBrief } from '@/shared/api';
import { env } from '@/shared/config';
import { addRecentContextPackOutput } from '@/shared/lib/contextPackStorage';
import {
  getAccessGate,
  getAccessGateMessage,
  isAccessGateErrorReason,
} from '@/shared/model/access';
import {
  type AgentType,
  agentTypeOptions,
  createManualExtractedContext,
  getContextValidationMessage,
} from '@/shared/model/contextPack';
import { InlineMessage } from '@/shared/ui/InlineMessage';

type SequenceStepStatus = 'idle' | 'loading' | 'success' | 'error';

interface SequenceStep {
  agentType: AgentType;
  markdown: string;
  status: SequenceStepStatus;
  title: string;
}

function getAgentLabel(agentType: AgentType): string {
  return (
    agentTypeOptions.find((option) => option.value === agentType)?.label ??
    agentType
  );
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);

  return nextItems;
}

export function SequencePanel() {
  const accessStore = useAccessStore();
  const accessGate = getAccessGate(accessStore);
  const [inputText, setInputText] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<AgentType[]>([
    'planner',
  ]);
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const inputContext = useMemo(
    () => createManualExtractedContext({ text: inputText }),
    [inputText],
  );
  const contextValidationMessage = getContextValidationMessage(inputContext);
  const canRun =
    accessStore.ready &&
    accessGate.kind === 'allowed' &&
    selectedAgents.length > 0 &&
    contextValidationMessage == null &&
    status !== 'loading';

  function toggleAgent(agentType: AgentType) {
    setSelectedAgents((currentAgents) => {
      if (currentAgents.includes(agentType)) {
        return currentAgents.filter((currentAgent) => currentAgent !== agentType);
      }

      return [...currentAgents, agentType];
    });
  }

  function moveAgent(agentType: AgentType, direction: 'up' | 'down') {
    setSelectedAgents((currentAgents) => {
      const currentIndex = currentAgents.indexOf(agentType);
      const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentAgents.length) {
        return currentAgents;
      }

      return moveItem(currentAgents, currentIndex, nextIndex);
    });
  }

  async function handleRunSequence() {
    if (!canRun) {
      return;
    }

    const access = await accessStore.prepareGenerationAccess();

    if (!access) {
      return;
    }

    let currentText = inputText;
    const nextSteps: SequenceStep[] = selectedAgents.map((agentType) => ({
      agentType,
      markdown: '',
      status: 'idle',
      title: getAgentLabel(agentType),
    }));

    setSteps(nextSteps);
    setErrorMessage(null);
    setStatus('loading');

    try {
      for (const [index, agentType] of selectedAgents.entries()) {
        setSteps((currentSteps) =>
          currentSteps.map((step, stepIndex) =>
            stepIndex === index ? { ...step, status: 'loading' } : step,
          ),
        );

        const context = createManualExtractedContext({
          text: currentText,
          title: `${getAgentLabel(agentType)} sequence input`,
        });
        const result = await generateBrief({
          access,
          payload: {
            agentType,
            context,
            credentialMode: access.kind === 'byok' ? 'byok' : 'subscription',
            options: {
              includeComments: true,
              includeLinkedItems: true,
              includeMissingInfo: true,
              includePromptForAI: true,
              includeQuestions: true,
              outputFormat: 'markdown',
              tone: 'detailed',
            },
          },
          serverBaseUrl: env.serverBaseUrl,
        });

        currentText = result.markdown;
        setSteps((currentSteps) =>
          currentSteps.map((step, stepIndex) =>
            stepIndex === index
              ? {
                  ...step,
                  markdown: result.markdown,
                  status: 'success',
                  title: result.title,
                }
              : step,
          ),
        );

        if (index === selectedAgents.length - 1) {
          await addRecentContextPackOutput({
            agentType: result.agentType,
            context,
            createdAt: result.createdAt,
            id: result.id,
            kind: 'generation',
            markdown: result.markdown,
            sourceTitle: 'Sequence workflow',
            title: result.title,
          });
        }
      }

      accessStore.clearAccessIssue();
      setStatus('success');
    } catch (error) {
      setSteps((currentSteps) =>
        currentSteps.map((step) =>
          step.status === 'loading' ? { ...step, status: 'error' } : step,
        ),
      );
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to run the sequence workflow.',
      );
      setStatus('error');
    }
  }

  return (
    <section className="panel sequence-panel" aria-labelledby="sequence-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="sequence-title">
            Sequence
          </h2>
          <p className="panel-subtitle">
            Arrange agents and pass each output to the next selected agent.
          </p>
        </div>
      </div>

      <div className="stack">
        {accessGate.kind === 'blocked' ? (
          <InlineMessage
            tone={
              isAccessGateErrorReason(accessGate.reason) ? 'error' : undefined
            }
          >
            {getAccessGateMessage(accessGate.reason)}
          </InlineMessage>
        ) : null}

        {contextValidationMessage ? (
          <InlineMessage tone="error">{contextValidationMessage}</InlineMessage>
        ) : null}

        {errorMessage ? (
          <InlineMessage tone="error">{errorMessage}</InlineMessage>
        ) : null}

        {status === 'success' ? (
          <InlineMessage tone="success">
            Sequence complete. Final output saved to Recent.
          </InlineMessage>
        ) : null}

        <div className="field">
          <label className="field-label" htmlFor="sequence-input">
            New content
          </label>
          <textarea
            className="text-area manual-context-input"
            disabled={status === 'loading'}
            id="sequence-input"
            onChange={(event) => {
              setInputText(event.target.value);
            }}
            placeholder="Paste or type the content to process through the selected agents."
            value={inputText}
          />
        </div>

        <div className="field">
          <span className="field-label">Agents</span>
          <div className="agent-list" aria-label="Sequence agents">
            {agentTypeOptions.map((option) => {
              const selectedIndex = selectedAgents.indexOf(option.value);
              const isSelected = selectedIndex >= 0;

              return (
                <div className="agent-row" key={option.value}>
                  <label className="checkbox-row">
                    <input
                      checked={isSelected}
                      disabled={status === 'loading'}
                      onChange={() => {
                        toggleAgent(option.value);
                      }}
                      type="checkbox"
                    />
                    {option.label}
                  </label>
                  {isSelected ? (
                    <span className="agent-order-controls">
                      <button
                        aria-label={`Move ${option.label} up`}
                        className="icon-button"
                        disabled={status === 'loading' || selectedIndex === 0}
                        onClick={() => {
                          moveAgent(option.value, 'up');
                        }}
                        type="button"
                      >
                        <ArrowUp size={15} strokeWidth={2.2} />
                      </button>
                      <button
                        aria-label={`Move ${option.label} down`}
                        className="icon-button"
                        disabled={
                          status === 'loading' ||
                          selectedIndex === selectedAgents.length - 1
                        }
                        onClick={() => {
                          moveAgent(option.value, 'down');
                        }}
                        type="button"
                      >
                        <ArrowDown size={15} strokeWidth={2.2} />
                      </button>
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="button-row">
          <button
            className="button button-primary"
            disabled={!canRun}
            onClick={() => {
              void handleRunSequence();
            }}
            type="button"
          >
            <Play size={16} strokeWidth={2.2} />
            {status === 'loading' ? 'Running...' : 'Run sequence'}
          </button>
        </div>

        {steps.length > 0 ? (
          <div className="sequence-step-list" aria-label="Sequence results">
            {steps.map((step, index) => (
              <article className="sequence-step" key={`${step.agentType}-${index}`}>
                <div className="sequence-step-header">
                  <strong>
                    {index + 1}. {getAgentLabel(step.agentType)}
                  </strong>
                  <span className="meta-pill">{step.status}</span>
                </div>
                {step.markdown ? (
                  <textarea
                    aria-label={`${getAgentLabel(step.agentType)} output`}
                    className="text-area markdown-preview"
                    readOnly
                    value={step.markdown}
                  />
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
