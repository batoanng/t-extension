import type { ExtractedContext } from '@/shared/model/contextPack';

import { extractContextFromSnapshot, type PageSnapshot } from './sourceAdapters';

type ScriptResult<T> = chrome.scripting.InjectionResult<T>;

function createManualContext(title: string, url?: string): ExtractedContext {
  return {
    attachments: [],
    codeBlocks: [],
    comments: [],
    description: '',
    labels: [],
    linkedItems: [],
    sourceType: 'manual_paste',
    tables: [],
    title,
    url,
  };
}

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
  const queryFirstText = (selector: string) => queryText(selector)[0] ?? '';
  const queryLinkedItems = () => {
    const seenUrls = new Set<string>();

    return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
      .map((anchor) => {
        const url = anchor.href.trim();
        const title = normalize(anchor.innerText || anchor.textContent || anchor.href);

        if (!url || !title || seenUrls.has(url)) {
          return null;
        }

        seenUrls.add(url);

        return {
          title,
          type: 'link',
          url,
        };
      })
      .filter((item): item is { title: string; type: string; url: string } => item != null)
      .slice(0, 24);
  };
  const queryAttachments = () =>
    Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        'a[href*="attachment" i], a[href*="download" i], a[href$=".png" i], a[href$=".jpg" i], a[href$=".jpeg" i], a[href$=".pdf" i]',
      ),
    )
      .map((anchor) => ({
        name: normalize(anchor.innerText || anchor.textContent || anchor.href),
        type: 'attachment',
        url: anchor.href.trim(),
      }))
      .filter((attachment) => attachment.name || attachment.url)
      .slice(0, 12);
  const queryTables = () =>
    Array.from(document.querySelectorAll<HTMLTableElement>('table'))
      .map((table) => {
        const rows = Array.from(table.querySelectorAll('tr')).map((row) =>
          Array.from(row.querySelectorAll('th, td'))
            .map((cell) => normalize(cell.textContent))
            .filter(Boolean),
        );
        const firstRow = rows[0] ?? [];
        const hasHeaderCells = table.querySelector('tr th') != null;

        return {
          headers: hasHeaderCells ? firstRow : [],
          rows: hasHeaderCells ? rows.slice(1, 12) : rows.slice(0, 12),
        };
      })
      .filter((table) => table.headers.length > 0 || table.rows.length > 0)
      .slice(0, 4);
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
    queryFirstText(
      '[data-testid*="status" i], [aria-label*="status" i], .State',
    );
  const priority =
    queryFirstText('[data-testid*="priority" i], [aria-label*="priority" i]') ??
    '';
  const assignee = queryFirstText(
    '[data-testid*="assignee" i], [aria-label*="assignee" i], [data-test-id*="assignee" i], [data-testid*="owner" i], [aria-label*="owner" i]',
  );
  const reporter = queryFirstText(
    '[data-testid*="reporter" i], [aria-label*="reporter" i], [data-test-id*="reporter" i], [data-testid*="author" i], [aria-label*="author" i]',
  );
  const description =
    queryFirstText(
      '[data-testid*="description" i], [data-test-id*="description" i], .markdown-body, article',
    );

  return {
    assignee: normalize(assignee),
    attachments: queryAttachments(),
    codeBlocks: queryText('pre, code').slice(0, 16),
    comments,
    description,
    extractedAt: new Date().toISOString(),
    headings,
    labels,
    linkedItems: queryLinkedItems(),
    metaDescription,
    priority: normalize(priority),
    reporter: normalize(reporter),
    selectedText: normalize(selectedText),
    status: normalize(status),
    tables: queryTables(),
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
    return createManualContext('Manual context');
  }

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!activeTab?.id || isRestrictedUrl(activeTab.url)) {
    return createManualContext(activeTab?.title || 'Manual context', activeTab?.url);
  }

  const results = await chrome.scripting.executeScript({
    func: extractCurrentPageSnapshot,
    target: {
      tabId: activeTab.id,
    },
  });
  const snapshot = getFirstInjectionResult(results);

  if (!snapshot) {
    return createManualContext(activeTab.title || 'Manual context', activeTab.url);
  }

  return extractContextFromSnapshot(snapshot);
}
