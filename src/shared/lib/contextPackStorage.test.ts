import { beforeEach, describe, expect, it } from 'vitest';

import {
  addRecentContextPackOutput,
  getLastAgentType,
  getRecentContextPackOutputs,
  removeRecentContextPackOutput,
  setLastAgentType,
} from './contextPackStorage';

describe('contextPackStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and reads the last selected agent type', async () => {
    expect(await getLastAgentType()).toBe('planner');

    await setLastAgentType('ci-expert');

    expect(await getLastAgentType()).toBe('ci-expert');
  });

  it('stores recent outputs newest first and de-duplicates by id', async () => {
    await addRecentContextPackOutput({
      agentType: 'planner',
      context: {
        attachments: [],
        codeBlocks: [],
        comments: [],
        labels: [],
        linkedItems: [],
        sourceType: 'manual',
        tables: [],
        title: 'Ticket one',
      },
      createdAt: '2026-05-08T00:00:00.000Z',
      id: 'gen_1',
      kind: 'generation',
      markdown: '# One',
      sourceTitle: 'Ticket one',
      title: 'One',
    });
    await addRecentContextPackOutput({
      agentType: 'planner',
      context: {
        attachments: [],
        codeBlocks: [],
        comments: [],
        labels: [],
        linkedItems: [],
        sourceType: 'manual',
        tables: [],
        title: 'Ticket one',
      },
      createdAt: '2026-05-08T00:01:00.000Z',
      id: 'gen_1',
      kind: 'generation',
      markdown: '# Updated',
      sourceTitle: 'Ticket one',
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

  it('removes recent outputs by id', async () => {
    await addRecentContextPackOutput({
      agentType: 'planner',
      context: {
        attachments: [],
        codeBlocks: [],
        comments: [],
        labels: [],
        linkedItems: [],
        sourceType: 'manual',
        tables: [],
        title: 'Ticket one',
      },
      createdAt: '2026-05-08T00:00:00.000Z',
      id: 'gen_1',
      kind: 'generation',
      markdown: '# One',
      sourceTitle: 'Ticket one',
      title: 'One',
    });
    await addRecentContextPackOutput({
      agentType: 'planner',
      context: {
        attachments: [],
        codeBlocks: [],
        comments: [],
        labels: [],
        linkedItems: [],
        sourceType: 'manual',
        tables: [],
        title: 'Ticket two',
      },
      createdAt: '2026-05-08T00:01:00.000Z',
      id: 'gen_2',
      kind: 'generation',
      markdown: '# Two',
      sourceTitle: 'Ticket two',
      title: 'Two',
    });

    await removeRecentContextPackOutput('gen_2');

    expect(await getRecentContextPackOutputs()).toEqual([
      expect.objectContaining({
        id: 'gen_1',
        markdown: '# One',
      }),
    ]);
  });
});
