import { beforeEach, describe, expect, it } from 'vitest';

import {
  addRecentContextPackOutput,
  getLastTargetRole,
  getRecentContextPackOutputs,
  setLastTargetRole,
} from './contextPackStorage';

describe('contextPackStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and reads the last selected target role', async () => {
    expect(await getLastTargetRole()).toBe('developer');

    await setLastTargetRole('tester');

    expect(await getLastTargetRole()).toBe('tester');
  });

  it('stores recent outputs newest first and de-duplicates by id', async () => {
    await addRecentContextPackOutput({
      createdAt: '2026-05-08T00:00:00.000Z',
      id: 'gen_1',
      markdown: '# One',
      outputType: 'implementation_brief',
      sourceTitle: 'Ticket one',
      targetRole: 'developer',
      title: 'One',
    });
    await addRecentContextPackOutput({
      createdAt: '2026-05-08T00:01:00.000Z',
      id: 'gen_1',
      markdown: '# Updated',
      outputType: 'implementation_brief',
      sourceTitle: 'Ticket one',
      targetRole: 'developer',
      title: 'Updated',
    });

    expect(await getRecentContextPackOutputs()).toEqual([
      expect.objectContaining({
        id: 'gen_1',
        markdown: '# Updated',
        title: 'Updated',
      }),
    ]);
  });
});
