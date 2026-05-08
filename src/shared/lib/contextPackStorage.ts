import {
  DEFAULT_TARGET_ROLE,
  MAX_RECENT_OUTPUTS,
  type RecentContextPackOutput,
  type TargetRole,
  targetRoles,
} from '@/shared/model/contextPack';

import { getStoredJson, getStoredString, setStoredJson, setStoredString } from './chromeStorage';

export const LAST_TARGET_ROLE_STORAGE_KEY = 'contextpackai_last_target_role';
export const RECENT_OUTPUTS_STORAGE_KEY = 'contextpackai_recent_outputs';

export async function getLastTargetRole(): Promise<TargetRole> {
  const storedRole = await getStoredString(LAST_TARGET_ROLE_STORAGE_KEY);

  return targetRoles.includes(storedRole as TargetRole)
    ? (storedRole as TargetRole)
    : DEFAULT_TARGET_ROLE;
}

export async function setLastTargetRole(role: TargetRole): Promise<void> {
  await setStoredString(LAST_TARGET_ROLE_STORAGE_KEY, role);
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

  return outputs
    .filter((output): output is RecentContextPackOutput => {
      return (
        typeof output?.id === 'string' &&
        typeof output.markdown === 'string' &&
        typeof output.title === 'string' &&
        targetRoles.includes(output.targetRole)
      );
    })
    .slice(0, MAX_RECENT_OUTPUTS);
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
