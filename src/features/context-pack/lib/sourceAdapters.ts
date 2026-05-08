import type { ExtractedContext, SourceType } from '@/shared/model/contextPack';

export interface PageSnapshot {
  comments: string[];
  description: string;
  headings: string[];
  labels: string[];
  metaDescription: string;
  priority: string;
  selectedText: string;
  status: string;
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
      comments: getComments(snapshot),
      description: getBestDescription(snapshot),
      labels: uniqueValues(snapshot.labels),
      priority: snapshot.priority || undefined,
      sourceType: 'jira',
      status: snapshot.status || undefined,
      title: issueKey && !title.includes(issueKey) ? `${issueKey} ${title}` : title,
      url: snapshot.url,
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
      comments: getComments(snapshot),
      description: getBestDescription(snapshot),
      labels: uniqueValues(snapshot.labels),
      priority: snapshot.priority || undefined,
      sourceType: 'linear',
      status: snapshot.status || undefined,
      title: issueKey && !title.includes(issueKey) ? `${issueKey} ${title}` : title,
      url: snapshot.url,
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
      comments: getComments(snapshot),
      description: getBestDescription(snapshot),
      labels: uniqueValues(snapshot.labels),
      sourceType: 'github_issue',
      status: snapshot.status || undefined,
      title:
        issueNumber && !title.includes(`#${issueNumber}`)
          ? `${title} #${issueNumber}`
          : title,
      url: snapshot.url,
    };
  },
};

export const sourceAdapters = [
  jiraAdapter,
  linearAdapter,
  githubIssueAdapter,
] as const;

export function extractContextFromSnapshot(
  snapshot: PageSnapshot,
): ExtractedContext {
  if (snapshot.selectedText.trim().length > 0) {
    return {
      comments: [],
      description: truncate(snapshot.selectedText, maxDescriptionLength),
      labels: [],
      sourceType: 'selected_text',
      title: getIssueTitle(snapshot) || 'Selected text',
      url: snapshot.url,
    };
  }

  const adapter = sourceAdapters.find((candidate) => candidate.matches(snapshot.url));

  if (adapter) {
    return adapter.extract(snapshot);
  }

  return {
    comments: [],
    description: getBestDescription(snapshot),
    labels: [],
    sourceType: 'web_page',
    title: getIssueTitle(snapshot),
    url: snapshot.url,
  };
}
