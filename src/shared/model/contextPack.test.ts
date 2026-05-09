import { describe, expect, it } from 'vitest';

import {
  getSourceTypeLabel,
  sourceTypes,
  type SourceType,
} from './contextPack';

const expectedLabels = {
  asana_task: 'Asana Task',
  azure_devops_work_item: 'Azure DevOps Work Item',
  clickup_task: 'ClickUp Task',
  confluence: 'Confluence Page',
  datadog_incident: 'Datadog Incident',
  figma: 'Figma File',
  generic_web: 'Web Page',
  github_issue: 'GitHub Issue',
  github_pr: 'GitHub Pull Request',
  gitlab_issue: 'GitLab Issue',
  google_docs: 'Google Doc',
  jira: 'Jira Issue',
  linear: 'Linear Issue',
  manual: 'Manual Context',
  manual_paste: 'Manual Context',
  notion: 'Notion Page',
  postman_docs: 'Postman Docs',
  selected_text: 'Selected Text',
  sentry_issue: 'Sentry Issue',
  slack_thread: 'Slack Thread',
  storybook_component: 'Storybook Component',
  swagger_openapi: 'Swagger/OpenAPI Page',
  trello_card: 'Trello Card',
  web_page: 'Web Page',
} as const satisfies Record<SourceType, string>;

describe('context pack source labels', () => {
  it.each(sourceTypes)('returns a label for %s', (sourceType) => {
    expect(getSourceTypeLabel(sourceType)).toBe(expectedLabels[sourceType]);
  });
});
