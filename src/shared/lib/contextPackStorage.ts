import {
  DEFAULT_AGENT_TYPE,
  type AgentType,
  type ExtractedContext,
  MAX_RECENT_OUTPUTS,
  type RecentCaptureOutput,
  type RecentContextPackOutput,
  agentTypes,
} from '@/shared/model/contextPack';

import { getStoredJson, getStoredString, setStoredJson, setStoredString } from './chromeStorage';

export const LAST_AGENT_TYPE_STORAGE_KEY = 'contextpackai_last_agent_type';
export const RECENT_OUTPUTS_STORAGE_KEY = 'contextpackai_recent_outputs';

export async function getLastAgentType(): Promise<AgentType> {
  const storedAgentType = await getStoredString(LAST_AGENT_TYPE_STORAGE_KEY);

  return agentTypes.includes(storedAgentType as AgentType)
    ? (storedAgentType as AgentType)
    : DEFAULT_AGENT_TYPE;
}

export async function setLastAgentType(agentType: AgentType): Promise<void> {
  await setStoredString(LAST_AGENT_TYPE_STORAGE_KEY, agentType);
}

function getLegacyContext(output: { sourceTitle?: unknown }): ExtractedContext {
  return {
    attachments: [],
    codeBlocks: [],
    comments: [],
    description: '',
    labels: [],
    linkedItems: [],
    sourceType: 'manual_paste',
    tables: [],
    title: typeof output.sourceTitle === 'string' ? output.sourceTitle : 'Restored context',
  };
}

function coerceRecentOutput(output: unknown): RecentContextPackOutput | null {
  if (!output || typeof output !== 'object') {
    return null;
  }

  const candidate = output as Record<string, unknown>;

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.createdAt !== 'string' ||
    typeof candidate.markdown !== 'string' ||
    typeof candidate.title !== 'string'
  ) {
    return null;
  }

  const sourceTitle =
    typeof candidate.sourceTitle === 'string' ? candidate.sourceTitle : candidate.title;

  if (
    candidate.kind === 'generation' &&
    agentTypes.includes(candidate.agentType as AgentType) &&
    candidate.context &&
    typeof candidate.context === 'object'
  ) {
    return {
      agentType: candidate.agentType as AgentType,
      context: candidate.context as ExtractedContext,
      createdAt: candidate.createdAt,
      id: candidate.id,
      kind: 'generation',
      markdown: candidate.markdown,
      sourceTitle,
      title: candidate.title,
    };
  }

  if (candidate.kind === 'capture') {
    const source = candidate.source && typeof candidate.source === 'object'
      ? (candidate.source as RecentCaptureOutput['source'])
      : {
          title: sourceTitle,
          type: 'upload' as const,
        };

    return {
      createdAt: candidate.createdAt,
      id: candidate.id,
      kind: 'capture',
      markdown: candidate.markdown,
      source,
      sourceTitle,
      title: candidate.title,
      warnings: Array.isArray(candidate.warnings)
        ? candidate.warnings.filter((warning): warning is string => typeof warning === 'string')
        : [],
    };
  }

  return {
    agentType: DEFAULT_AGENT_TYPE,
    context: getLegacyContext(candidate),
    createdAt: candidate.createdAt,
    id: candidate.id,
    kind: 'generation',
    markdown: candidate.markdown,
    sourceTitle,
    title: candidate.title,
  };
}

export async function getRecentContextPackOutputs(): Promise<
  RecentContextPackOutput[]
> {
  const outputs = await getStoredJson<RecentContextPackOutput[]>(
    RECENT_OUTPUTS_STORAGE_KEY,
  );

  if (!Array.isArray(outputs)) {
    return [];
  }

  return outputs.map(coerceRecentOutput).filter((output) => output != null).slice(0, MAX_RECENT_OUTPUTS);
}

export async function addRecentContextPackOutput(
  output: RecentContextPackOutput,
): Promise<RecentContextPackOutput[]> {
  const currentOutputs = await getRecentContextPackOutputs();
  const nextOutputs = [
    output,
    ...currentOutputs.filter((currentOutput) => currentOutput.id !== output.id),
  ].slice(0, MAX_RECENT_OUTPUTS);

  await setStoredJson(RECENT_OUTPUTS_STORAGE_KEY, nextOutputs);

  return nextOutputs;
}
