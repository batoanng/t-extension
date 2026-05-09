import type { ExtractedContext, SourceType } from '@/shared/model/contextPack';

type LinkedItem = ExtractedContext['linkedItems'][number];
type AttachmentMetadata = ExtractedContext['attachments'][number];
type ExtractedTable = ExtractedContext['tables'][number];

export interface PageSnapshot {
  assignee: string;
  attachments: AttachmentMetadata[];
  codeBlocks: string[];
  comments: string[];
  description: string;
  extractedAt: string;
  headings: string[];
  labels: string[];
  linkedItems: LinkedItem[];
  metaDescription: string;
  priority: string;
  reporter: string;
  selectedText: string;
  status: string;
  tables: ExtractedTable[];
  text: string;
  title: string;
  url: string;
}

export interface SourceAdapter {
  extract(snapshot: PageSnapshot): ExtractedContext;
  id: SourceType;
  matches(url: string): boolean;
  name: string;
}

const maxDescriptionLength = 6000;
const maxCommentLength = 1400;
const maxComments = 8;
const maxRawTextLength = 2500;
const maxCodeBlockLength = 1200;
const maxCodeBlocks = 8;
const maxLinkedItems = 12;
const maxAttachments = 8;
const maxTables = 4;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength: number): string {
  const normalized = normalizeWhitespace(value);

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function uniqueValues(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeWhitespace(value))
        .filter((value) => value.length > 0),
    ),
  );
}

function getBestDescription(snapshot: PageSnapshot): string {
  return truncate(
    snapshot.description || snapshot.metaDescription || snapshot.text,
    maxDescriptionLength,
  );
}

function getComments(snapshot: PageSnapshot): string[] {
  return uniqueValues(snapshot.comments)
    .slice(0, maxComments)
    .map((comment) => truncate(comment, maxCommentLength));
}

function getIssueTitle(snapshot: PageSnapshot): string {
  return truncate(snapshot.headings[0] || snapshot.title, 240);
}

function formatTitleWithId(title: string, id: string | undefined): string {
  if (!id || title.toLowerCase().includes(id.toLowerCase())) {
    return title;
  }

  return `${id} ${title}`;
}

function getPreservedMetadata(snapshot: PageSnapshot) {
  return {
    assignee: snapshot.assignee || undefined,
    attachments: snapshot.attachments.slice(0, maxAttachments),
    codeBlocks: uniqueValues(snapshot.codeBlocks)
      .slice(0, maxCodeBlocks)
      .map((codeBlock) => truncate(codeBlock, maxCodeBlockLength)),
    extractedAt: snapshot.extractedAt,
    labels: uniqueValues(snapshot.labels),
    linkedItems: snapshot.linkedItems.slice(0, maxLinkedItems),
    priority: snapshot.priority || undefined,
    rawText: truncate(snapshot.text, maxRawTextLength),
    reporter: snapshot.reporter || undefined,
    selectedText: snapshot.selectedText || undefined,
    status: snapshot.status || undefined,
    tables: snapshot.tables.slice(0, maxTables),
  };
}

function createExtractedContext(
  snapshot: PageSnapshot,
  sourceType: SourceType,
  title = getIssueTitle(snapshot),
): ExtractedContext {
  return {
    ...getPreservedMetadata(snapshot),
    comments: getComments(snapshot),
    description: getBestDescription(snapshot),
    sourceType,
    title,
    url: snapshot.url,
  };
}

function getUrlMatch(url: string, pattern: RegExp): RegExpMatchArray | null {
  return url.match(pattern);
}

export const jiraAdapter: SourceAdapter = {
  id: 'jira',
  name: 'Jira Issue',
  matches(url) {
    return /atlassian\.net\/browse\/[A-Z][A-Z0-9]+-\d+/i.test(url);
  },
  extract(snapshot) {
    const issueKey = snapshot.url.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/i)?.[1];
    const title = getIssueTitle(snapshot);

    return {
      ...createExtractedContext(
        snapshot,
        'jira',
        issueKey && !title.includes(issueKey) ? `${issueKey} ${title}` : title,
      ),
      sourceType: 'jira',
    };
  },
};

export const linearAdapter: SourceAdapter = {
  id: 'linear',
  name: 'Linear Issue',
  matches(url) {
    return /linear\.app\/.+\/issue\/[A-Z][A-Z0-9]+-\d+/i.test(url);
  },
  extract(snapshot) {
    const issueKey = snapshot.url.match(/\/issue\/([A-Z][A-Z0-9]+-\d+)/i)?.[1];
    const title = getIssueTitle(snapshot);

    return {
      ...createExtractedContext(
        snapshot,
        'linear',
        issueKey && !title.includes(issueKey) ? `${issueKey} ${title}` : title,
      ),
      sourceType: 'linear',
    };
  },
};

export const githubIssueAdapter: SourceAdapter = {
  id: 'github_issue',
  name: 'GitHub Issue',
  matches(url) {
    return /github\.com\/[^/]+\/[^/]+\/issues\/\d+/i.test(url);
  },
  extract(snapshot) {
    const issueNumber = snapshot.url.match(/\/issues\/(\d+)/i)?.[1];
    const title = getIssueTitle(snapshot);

    return {
      ...createExtractedContext(
        snapshot,
        'github_issue',
        issueNumber && !title.includes(`#${issueNumber}`)
          ? `${title} #${issueNumber}`
          : title,
      ),
      sourceType: 'github_issue',
    };
  },
};

export const githubPullRequestAdapter: SourceAdapter = {
  id: 'github_pr',
  name: 'GitHub Pull Request',
  matches(url) {
    return /github\.com\/[^/]+\/[^/]+\/pull\/\d+/i.test(url);
  },
  extract(snapshot) {
    const pullRequestNumber = snapshot.url.match(/\/pull\/(\d+)/i)?.[1];
    const title = getIssueTitle(snapshot);

    return createExtractedContext(
      snapshot,
      'github_pr',
      pullRequestNumber && !title.includes(`#${pullRequestNumber}`)
        ? `${title} #${pullRequestNumber}`
        : title,
    );
  },
};

export const notionAdapter: SourceAdapter = {
  id: 'notion',
  name: 'Notion Page',
  matches(url) {
    return /notion\.(so|site)\//i.test(url);
  },
  extract(snapshot) {
    return createExtractedContext(snapshot, 'notion');
  },
};

export const confluenceAdapter: SourceAdapter = {
  id: 'confluence',
  name: 'Confluence Page',
  matches(url) {
    return /atlassian\.net\/wiki\//i.test(url) || /\/confluence\/display\//i.test(url);
  },
  extract(snapshot) {
    return createExtractedContext(snapshot, 'confluence');
  },
};

export const figmaAdapter: SourceAdapter = {
  id: 'figma',
  name: 'Figma File',
  matches(url) {
    return /figma\.com\/(file|design|proto)\/[^/]+/i.test(url);
  },
  extract(snapshot) {
    return createExtractedContext(snapshot, 'figma');
  },
};

export const googleDocsAdapter: SourceAdapter = {
  id: 'google_docs',
  name: 'Google Docs',
  matches(url) {
    return /docs\.google\.com\/document\/d\/[^/]+/i.test(url);
  },
  extract(snapshot) {
    return createExtractedContext(snapshot, 'google_docs');
  },
};

export const gitlabIssueAdapter: SourceAdapter = {
  id: 'gitlab_issue',
  name: 'GitLab Issue',
  matches(url) {
    return /\/[^/]+\/[^/]+\/-\/issues\/\d+/i.test(url);
  },
  extract(snapshot) {
    const issueNumber = getUrlMatch(snapshot.url, /\/-\/issues\/(\d+)/i)?.[1];
    const title = getIssueTitle(snapshot);

    return createExtractedContext(
      snapshot,
      'gitlab_issue',
      issueNumber && !title.includes(`#${issueNumber}`)
        ? `${title} #${issueNumber}`
        : title,
    );
  },
};

export const azureDevopsWorkItemAdapter: SourceAdapter = {
  id: 'azure_devops_work_item',
  name: 'Azure DevOps Work Item',
  matches(url) {
    return (
      /dev\.azure\.com\/[^/]+\/[^/]+\/_workitems\/edit\/\d+/i.test(url) ||
      /visualstudio\.com\/.*\/_workitems\/edit\/\d+/i.test(url)
    );
  },
  extract(snapshot) {
    const workItemId = getUrlMatch(snapshot.url, /\/_workitems\/edit\/(\d+)/i)?.[1];
    const title = getIssueTitle(snapshot);

    return createExtractedContext(
      snapshot,
      'azure_devops_work_item',
      formatTitleWithId(title, workItemId),
    );
  },
};

export const trelloCardAdapter: SourceAdapter = {
  id: 'trello_card',
  name: 'Trello Card',
  matches(url) {
    return /trello\.com\/c\/[A-Za-z0-9]+/i.test(url);
  },
  extract(snapshot) {
    return createExtractedContext(snapshot, 'trello_card');
  },
};

export const clickUpTaskAdapter: SourceAdapter = {
  id: 'clickup_task',
  name: 'ClickUp Task',
  matches(url) {
    return /app\.clickup\.com\/t\/[A-Za-z0-9]+/i.test(url) || /sharing\.clickup\.com\/.+\/t\/[A-Za-z0-9]+/i.test(url);
  },
  extract(snapshot) {
    return createExtractedContext(snapshot, 'clickup_task');
  },
};

export const asanaTaskAdapter: SourceAdapter = {
  id: 'asana_task',
  name: 'Asana Task',
  matches(url) {
    return /app\.asana\.com\/0\/\d+\/\d+/i.test(url);
  },
  extract(snapshot) {
    return createExtractedContext(snapshot, 'asana_task');
  },
};

export const slackThreadAdapter: SourceAdapter = {
  id: 'slack_thread',
  name: 'Slack Thread',
  matches(url) {
    return (
      /app\.slack\.com\/client\/[A-Z0-9]+\/[A-Z0-9]+\/thread\/[A-Z0-9]+-\d+\.\d+/i.test(url) ||
      /[^.]+\.slack\.com\/archives\/[A-Z0-9]+\/p\d+/i.test(url)
    );
  },
  extract(snapshot) {
    return createExtractedContext(snapshot, 'slack_thread');
  },
};

export const sentryIssueAdapter: SourceAdapter = {
  id: 'sentry_issue',
  name: 'Sentry Issue',
  matches(url) {
    return /sentry\.io\/organizations\/[^/]+\/issues\/\d+/i.test(url);
  },
  extract(snapshot) {
    const issueId = getUrlMatch(snapshot.url, /\/issues\/(\d+)/i)?.[1];

    return createExtractedContext(
      snapshot,
      'sentry_issue',
      formatTitleWithId(getIssueTitle(snapshot), issueId),
    );
  },
};

export const datadogIncidentAdapter: SourceAdapter = {
  id: 'datadog_incident',
  name: 'Datadog Incident',
  matches(url) {
    return /app\.datadoghq\.com\/incidents\/\d+/i.test(url);
  },
  extract(snapshot) {
    const incidentId = getUrlMatch(snapshot.url, /\/incidents\/(\d+)/i)?.[1];

    return createExtractedContext(
      snapshot,
      'datadog_incident',
      formatTitleWithId(getIssueTitle(snapshot), incidentId),
    );
  },
};

export const storybookComponentAdapter: SourceAdapter = {
  id: 'storybook_component',
  name: 'Storybook Component',
  matches(url) {
    return /\/storybook\/?/i.test(url) || /iframe\.html.*id=/i.test(url) || /[?#&]path=\/story\//i.test(url);
  },
  extract(snapshot) {
    return createExtractedContext(snapshot, 'storybook_component');
  },
};

export const swaggerOpenApiAdapter: SourceAdapter = {
  id: 'swagger_openapi',
  name: 'Swagger/OpenAPI Page',
  matches(url) {
    return /swagger|openapi|api-docs|swagger-ui|\/docs\/api/i.test(url);
  },
  extract(snapshot) {
    return createExtractedContext(snapshot, 'swagger_openapi');
  },
};

export const postmanDocsAdapter: SourceAdapter = {
  id: 'postman_docs',
  name: 'Postman Docs',
  matches(url) {
    return /documenter\.getpostman\.com\/view\/[^/]+/i.test(url) || /postman\.com\/.+\/documentation\//i.test(url);
  },
  extract(snapshot) {
    return createExtractedContext(snapshot, 'postman_docs');
  },
};

export const sourceAdapters = [
  jiraAdapter,
  linearAdapter,
  githubIssueAdapter,
  githubPullRequestAdapter,
  notionAdapter,
  confluenceAdapter,
  figmaAdapter,
  googleDocsAdapter,
  gitlabIssueAdapter,
  azureDevopsWorkItemAdapter,
  trelloCardAdapter,
  clickUpTaskAdapter,
  asanaTaskAdapter,
  slackThreadAdapter,
  sentryIssueAdapter,
  datadogIncidentAdapter,
  storybookComponentAdapter,
  swaggerOpenApiAdapter,
  postmanDocsAdapter,
] as const;

export function extractContextFromSnapshot(
  snapshot: PageSnapshot,
): ExtractedContext {
  if (snapshot.selectedText.trim().length > 0) {
    return {
      ...getPreservedMetadata(snapshot),
      comments: [],
      description: truncate(snapshot.selectedText, maxDescriptionLength),
      sourceType: 'selected_text',
      selectedText: truncate(snapshot.selectedText, maxDescriptionLength),
      title: getIssueTitle(snapshot) || 'Selected text',
      url: snapshot.url,
    };
  }

  const adapter = sourceAdapters.find((candidate) => candidate.matches(snapshot.url));

  if (adapter) {
    return adapter.extract(snapshot);
  }

  return {
    ...createExtractedContext(snapshot, 'generic_web'),
    sourceType: 'generic_web',
  };
}
