import { describe, expect, it } from 'vitest';

import {
  extractContextFromSnapshot,
  sourceAdapters,
  type PageSnapshot,
} from './sourceAdapters';

const baseSnapshot: PageSnapshot = {
  assignee: 'Ava Developer',
  attachments: [
    {
      name: 'checkout-state.png',
      type: 'attachment',
      url: 'https://example.com/checkout-state.png',
    },
  ],
  codeBlocks: ['GET /api/discounts/{code}'],
  comments: ['Looks good', 'Needs QA'],
  description: 'Customers can enter discount codes.',
  extractedAt: '2026-05-09T00:00:00.000Z',
  headings: ['Add discount code validation'],
  labels: ['checkout', 'payments'],
  linkedItems: [
    {
      title: 'Related PR',
      type: 'link',
      url: 'https://github.com/acme/shop/pull/12',
    },
  ],
  metaDescription: '',
  priority: 'High',
  reporter: 'Priya PM',
  selectedText: '',
  status: 'In Progress',
  tables: [
    {
      headers: ['Scenario', 'Expected'],
      rows: [['Valid code', 'Discount applies']],
    },
  ],
  text: 'Fallback page text',
  title: 'Browser title',
  url: 'https://example.atlassian.net/browse/SHOP-123',
};

const sourceUrlCases = [
  ['github_pr', 'https://github.com/acme/shop/pull/42'],
  ['notion', 'https://www.notion.so/acme/Product-spec-abc123'],
  ['confluence', 'https://acme.atlassian.net/wiki/spaces/PROD/pages/123/Spec'],
  ['figma', 'https://www.figma.com/design/abc123/Checkout?node-id=1-2'],
  ['google_docs', 'https://docs.google.com/document/d/abc123/edit'],
  ['gitlab_issue', 'https://gitlab.com/acme/shop/-/issues/77'],
  [
    'azure_devops_work_item',
    'https://dev.azure.com/acme/shop/_workitems/edit/881',
  ],
  ['trello_card', 'https://trello.com/c/abc123/add-discount-validation'],
  ['clickup_task', 'https://app.clickup.com/t/86abc123'],
  ['asana_task', 'https://app.asana.com/0/120123456789/120987654321'],
  [
    'slack_thread',
    'https://app.slack.com/client/T123/C456/thread/C456-1715151515.123456',
  ],
  ['sentry_issue', 'https://sentry.io/organizations/acme/issues/123456789/'],
  ['datadog_incident', 'https://app.datadoghq.com/incidents/123'],
  ['storybook_component', 'https://ui.example.com/iframe.html?id=button--primary'],
  ['swagger_openapi', 'https://api.example.com/swagger-ui/index.html'],
  ['postman_docs', 'https://documenter.getpostman.com/view/12345/acme-api'],
] as const;

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

  it.each(sourceUrlCases)('detects %s URLs', (sourceType, url) => {
    expect(
      extractContextFromSnapshot({
        ...baseSnapshot,
        url,
      }),
    ).toEqual(
      expect.objectContaining({
        sourceType,
      }),
    );
  });

  it('preserves richer metadata for work item sources', () => {
    expect(
      extractContextFromSnapshot({
        ...baseSnapshot,
        url: 'https://gitlab.com/acme/shop/-/issues/77',
      }),
    ).toEqual(
      expect.objectContaining({
        assignee: 'Ava Developer',
        attachments: baseSnapshot.attachments,
        codeBlocks: baseSnapshot.codeBlocks,
        linkedItems: baseSnapshot.linkedItems,
        reporter: 'Priya PM',
        sourceType: 'gitlab_issue',
        tables: baseSnapshot.tables,
      }),
    );
  });

  it('normalizes API documentation pages with code and table context', () => {
    expect(
      extractContextFromSnapshot({
        ...baseSnapshot,
        url: 'https://api.example.com/openapi',
      }),
    ).toEqual(
      expect.objectContaining({
        codeBlocks: ['GET /api/discounts/{code}'],
        sourceType: 'swagger_openapi',
        tables: baseSnapshot.tables,
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

  it('keeps adapter detection after selected text precedence is handled first', () => {
    expect(
      sourceAdapters.some((adapter) =>
        adapter.matches('https://www.figma.com/file/abc123/Checkout'),
      ),
    ).toBe(true);
  });

  it('falls back to generic web page context', () => {
    expect(
      extractContextFromSnapshot({
        ...baseSnapshot,
        url: 'https://docs.example.com/spec',
      }),
    ).toEqual(
      expect.objectContaining({
        sourceType: 'generic_web',
        title: 'Add discount code validation',
      }),
    );
  });
});
