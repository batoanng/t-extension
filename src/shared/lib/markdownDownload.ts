export function createMarkdownFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);

  return `${slug || 'oneagent-markdown'}.md`;
}

export function downloadMarkdown(title: string, markdown: string) {
  const blob = new Blob([markdown], {
    type: 'text/markdown;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = createMarkdownFileName(title);
  anchor.click();
  URL.revokeObjectURL(url);
}
