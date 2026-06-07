import { Camera, Copy, Download, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

import { useAccessStore } from '@/features/access/model/useAccessStore';
import { useCaptureMarkdown } from '@/features/capture/model/useCaptureMarkdown';
import { env } from '@/shared/config';
import { downloadMarkdown } from '@/shared/lib/markdownDownload';
import { getAccessGate, getAccessGateMessage } from '@/shared/model/access';
import type { RecentCaptureOutput } from '@/shared/model/contextPack';
import {
  type ExtractionMimeType,
  extractionMimeTypes,
} from '@/shared/model/extraction';
import { InlineMessage } from '@/shared/ui/InlineMessage';

function isSupportedMimeType(value: string): value is ExtractionMimeType {
  return extractionMimeTypes.includes(value as ExtractionMimeType);
}

function getDataUrlPayload(dataUrl: string) {
  const match = /^data:([^;,]+);base64,(.+)$/u.exec(dataUrl);

  if (!match) {
    return null;
  }

  return {
    dataBase64: match[2],
    mimeType: match[1],
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('error', () => {
      reject(new Error('Unable to read file.'));
    });
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Unable to read file.'));
    });
    reader.readAsDataURL(file);
  });
}

interface CaptureMarkdownPanelProps {
  restoredOutput?: RecentCaptureOutput | null;
}

export function CaptureMarkdownPanel({
  restoredOutput = null,
}: CaptureMarkdownPanelProps) {
  const accessStore = useAccessStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    copyMarkdown,
    copyStatus,
    errorMessage,
    restoreCaptureOutput,
    result,
    runCaptureMarkdown,
    setCaptureError,
    sourceLabel,
    status,
  } = useCaptureMarkdown();
  const accessGate = getAccessGate(accessStore);
  const canExtract =
    accessStore.ready &&
    accessGate.kind === 'allowed' &&
    status !== 'loading';
  const markdown = result?.markdown ?? '';
  const helperMessage = useMemo(() => {
    if (accessGate.kind === 'blocked') {
      return getAccessGateMessage(accessGate.reason);
    }

    return null;
  }, [accessGate]);

  useEffect(() => {
    if (!restoredOutput) {
      return;
    }

    restoreCaptureOutput(restoredOutput);
  }, [restoreCaptureOutput, restoredOutput]);

  async function runExtraction(input: {
    dataBase64: string;
    filename?: string;
    mimeType: ExtractionMimeType;
    source: {
      title?: string;
      type: 'upload' | 'visible_tab';
      url?: string;
    };
  }) {
    if (!canExtract) {
      return;
    }

    const access = await accessStore.prepareGenerationAccess();

    if (!access) {
      return;
    }

    await runCaptureMarkdown({
      access,
      payload: input,
      serverBaseUrl: env.serverBaseUrl,
    });
  }

  async function handleCaptureVisibleTab() {
    if (!globalThis.chrome?.tabs?.captureVisibleTab) {
      setCaptureError('Visible tab capture is available only inside Chrome.');
      return;
    }

    try {
      const [activeTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const dataUrl = await chrome.tabs.captureVisibleTab(activeTab?.windowId, {
        format: 'png',
      });
      const payload = getDataUrlPayload(dataUrl);

      if (!payload || !isSupportedMimeType(payload.mimeType)) {
        setCaptureError('Chrome returned an unsupported screenshot format.');
        return;
      }

      await runExtraction({
        dataBase64: payload.dataBase64,
        filename: 'visible-tab.png',
        mimeType: payload.mimeType,
        source: {
          title: activeTab?.title ?? 'Visible tab capture',
          type: 'visible_tab',
          url: activeTab?.url,
        },
      });
    } catch {
      setCaptureError(
        'Unable to capture the visible tab. Reopen the side panel from the extension button and try again.',
      );
    }
  }

  async function handleUpload(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!isSupportedMimeType(file.type)) {
      setCaptureError('Upload a PNG, JPEG, WebP, or PDF source.');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const payload = getDataUrlPayload(dataUrl);

      if (!payload || !isSupportedMimeType(payload.mimeType)) {
        setCaptureError('Upload a PNG, JPEG, WebP, or PDF source.');
        return;
      }

      await runExtraction({
        dataBase64: payload.dataBase64,
        filename: file.name,
        mimeType: payload.mimeType,
        source: {
          title: file.name,
          type: 'upload',
        },
      });
    } catch {
      setCaptureError('Unable to read the selected file.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <section className="panel capture-panel" aria-labelledby="capture-title">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" id="capture-title">
            Capture to Markdown
          </h2>
          <p className="panel-subtitle">
            Convert a visible tab screenshot, image, or PDF into Markdown.
          </p>
        </div>
      </div>

      <div className="stack">
        <div className="detected-row">
          <span className="meta-pill">{sourceLabel}</span>
          <span className="meta-pill">
            {status === 'loading' ? 'Extracting' : 'Markdown'}
          </span>
        </div>

        {helperMessage ? <InlineMessage>{helperMessage}</InlineMessage> : null}

        {errorMessage ? (
          <InlineMessage tone="error">{errorMessage}</InlineMessage>
        ) : null}

        {copyStatus === 'success' ? (
          <InlineMessage tone="success">Markdown copied.</InlineMessage>
        ) : null}

        {copyStatus === 'error' ? (
          <InlineMessage tone="error">Unable to copy markdown.</InlineMessage>
        ) : null}

        {result?.warnings.length ? (
          <InlineMessage>{result.warnings.join(' ')}</InlineMessage>
        ) : null}

        <div className="button-row">
          <button
            className="button button-primary"
            disabled={!canExtract}
            onClick={() => {
              void handleCaptureVisibleTab();
            }}
            type="button"
          >
            <Camera size={16} strokeWidth={2.2} />
            {status === 'loading' ? 'Extracting...' : 'Capture visible tab'}
          </button>
          <button
            className="button button-secondary"
            disabled={!canExtract}
            onClick={() => {
              fileInputRef.current?.click();
            }}
            type="button"
          >
            <Upload size={16} strokeWidth={2.2} />
            Upload source
          </button>
          <input
            accept={extractionMimeTypes.join(',')}
            aria-label="Upload image or PDF source"
            className="visually-hidden-input"
            onChange={(event) => {
              void handleUpload(event.target.files?.[0]);
            }}
            ref={fileInputRef}
            type="file"
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="capture-markdown-preview">
            Markdown preview
          </label>
          <textarea
            className="text-area markdown-preview"
            id="capture-markdown-preview"
            placeholder="Extracted markdown will appear here."
            readOnly
            value={markdown}
          />
        </div>

        <div className="status-row">
          <button
            className="button button-secondary"
            disabled={!markdown || status === 'loading'}
            onClick={() => {
              void copyMarkdown();
            }}
            type="button"
          >
            <Copy size={16} strokeWidth={2.2} />
            Copy
          </button>
          <button
            className="button button-secondary"
            disabled={!markdown || status === 'loading'}
            onClick={() => {
              if (result) {
                downloadMarkdown(result.title, result.markdown);
              }
            }}
            type="button"
          >
            <Download size={16} strokeWidth={2.2} />
            Download .md
          </button>
        </div>
      </div>
    </section>
  );
}
