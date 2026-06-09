/**
 * Opens an external URL in a new browser tab. Prefers `chrome.tabs.create`
 * (reliable from the extension side panel) and falls back to `window.open`
 * when the Chrome tabs API is unavailable (e.g. in tests or web contexts).
 */
export function openExternalUrl(url: string): void {
  if (typeof globalThis.chrome?.tabs?.create === 'function') {
    void chrome.tabs.create({ url });
    return;
  }

  globalThis.open?.(url, '_blank', 'noopener,noreferrer');
}
