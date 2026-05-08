import { describe, expect, it } from 'vitest';

import { extractContextFromSnapshot, type PageSnapshot } from './sourceAdapters';

const baseSnapshot: PageSnapshot = {
  comments: ['Looks good', 'Needs QA'],
  description: 'Customers can enter discount codes.',
  headings: ['Add discount code validation'],
  labels: ['checkout', 'payments'],
  metaDescription: '',
  priority: 'High',
  selectedText: '',
  status: 'In Progress',
  text: 'Fallback page text',
  title: 'Browser title',
  url: 'https://example.atlassian.net/browse/SHOP-123',
};

describe('source adapters', () => {
  it('extracts Jira issue context', () => {
    expect(extractContextFromSnapshot(baseSnapshot)).toEqual(
      expect.objectContaining({
        description: 'Customers can enter discount codes.',
        labels: ['checkout', 'payments'],
        priority: 'High',
        sourceType: 'jira',
        status: 'In Progress',
        title: 'SHOP-123 Add discount code validation',
      }),
    );
  });

  it('prefers selected text over page adapters', () => {
    expect(
      extractContextFromSnapshot({
        ...baseSnapshot,
        selectedText: 'Only use this selected requirement.',
      }),
    ).toEqual(
      expect.objectContaining({
        description: 'Only use this selected requirement.',
        sourceType: 'selected_text',
      }),
    );
  });

  it('falls back to generic web page context', () => {
    expect(
      extractContextFromSnapshot({
        ...baseSnapshot,
        url: 'https://docs.example.com/spec',
      }),
    ).toEqual(
      expect.objectContaining({
        sourceType: 'web_page',
        title: 'Add discount code validation',
      }),
    );
  });
});
