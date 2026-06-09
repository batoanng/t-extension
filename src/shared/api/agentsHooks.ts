import { useQuery } from '@tanstack/react-query';

import {
  type Agent,
  type AgentOption,
  fallbackAgents,
  toAgentOption,
} from '@/shared/model/contextPack';

import { fetchAgents } from './agentsApi';

export const AGENTS_QUERY_KEY = ['agents'] as const;

export interface UseAgentsResult {
  /** Resolved agent list, or the offline fallback while loading/on error. */
  agents: Agent[];
  /** `{ label, value }` options derived from `agents`, ready for selectors. */
  agentOptions: AgentOption[];
  isError: boolean;
  isLoading: boolean;
  /** True once a real (non-fallback) list has been fetched from the backend. */
  isResolved: boolean;
}

/**
 * Fetches the backend-owned agent list once and shares it across panels via
 * React Query's cache. Falls back to the built-in list while loading or when
 * the request fails so the agent selectors always have something to render.
 */
export function useAgents(): UseAgentsResult {
  const query = useQuery({
    queryFn: ({ signal }) => fetchAgents({ signal }),
    queryKey: AGENTS_QUERY_KEY,
  });

  const agents = query.data ?? fallbackAgents;

  return {
    agentOptions: agents.map(toAgentOption),
    agents,
    isError: query.isError,
    isLoading: query.isLoading,
    isResolved: query.data != null,
  };
}
