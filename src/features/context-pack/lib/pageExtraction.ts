import type { ExtractedContext } from '@/shared/model/contextPack';

import { extractContextFromSnapshot, type PageSnapshot } from './sourceAdapters';

type ScriptResult<T> = chrome.scripting.InjectionResult<T>;

function isRestrictedUrl(url: string | undefined): boolean {
  return !url || /^(chrome|edge|about|chrome-extension):/i.test(url);
}

function extractCurrentPageSnapshot(): PageSnapshot {
  const normalize = (value: string | null | undefined) =>
    (value ?? '').replace(/\s+/g, ' ').trim();
  const queryText = (selector: string) =>
    Array.from(document.querySelectorAll<HTMLElement>(selector))
      .map((element) => normalize(element.innerText || element.textContent))
      .filter(Boolean);
  const metaDescription =
    document
      .querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.content.trim() ?? '';
  const selectedText = globalThis.getSelection?.()?.toString() ?? '';
  const headings = queryText('h1, [data-testid*="title" i], .js-issue-title');
  const labels = queryText(
    '[data-testid*="label" i], .IssueLabel, [aria-label*="label" i]',
  ).slice(0, 16);
  const comments = queryText(
    '[data-testid*="comment" i], .timeline-comment .comment-body, [data-test-id*="comment" i]',
  );
  const status =
    queryText(
      '[data-testid*="status" i], [aria-label*="status" i], .State',
    )[0] ?? '';
  const priority =
    queryText('[data-testid*="priority" i], [aria-label*="priority" i]')[0] ??
    '';
  const description =
    queryText(
      '[data-testid*="description" i], [data-test-id*="description" i], .markdown-body, article',
    )[0] ?? '';

  return {
    comments,
    description,
    headings,
    labels,
    metaDescription,
    priority: normalize(priority),
    selectedText: normalize(selectedText),
    status: normalize(status),
    text: normalize(document.body?.innerText).slice(0, 12_000),
    title: normalize(document.title),
    url: location.href,
  };
}

function getFirstInjectionResult<T>(
  results: Array<ScriptResult<T>> | undefined,
): T | null {
  return results?.[0]?.result ?? null;
}

export async function extractCurrentTabContext(): Promise<ExtractedContext> {
  if (!globalThis.chrome?.tabs?.query || !globalThis.chrome?.scripting) {
    return {
      comments: [],
      description: '',
      labels: [],
      sourceType: 'manual',
      title: 'Manual context',
    };
  }

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTab?.id || isRestrictedUrl(activeTab.url)) {
    return {
      comments: [],
      description: '',
      labels: [],
      sourceType: 'manual',
      title: activeTab?.title || 'Manual context',
      url: activeTab?.url,
    };
  }

  const results = await chrome.scripting.executeScript({
    func: extractCurrentPageSnapshot,
    target: {
      tabId: activeTab.id,
    },
  });
  const snapshot = getFirstInjectionResult(results);

  if (!snapshot) {
    return {
      comments: [],
      description: '',
      labels: [],
      sourceType: 'manual',
      title: activeTab.title || 'Manual context',
      url: activeTab.url,
    };
  }

  return extractContextFromSnapshot(snapshot);
}
