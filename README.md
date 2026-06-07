# ContextPackAI Chrome Extension

ContextPackAI turns browser work context from Jira, Linear, GitHub Issues, selected text, screenshots, uploads, or manual notes into agent-specific Markdown for software teams.

## MVP Flow

- Extract the current page or selected text.
- Choose an agent type. `planner` is the default, with `ci-expert`, `data-analyst`, `design-architect`, and `security-architect` also available.
- Generate the matching Markdown through the ContextPackAI backend and OpenRouter.
- Copy the Markdown, download it as `.md`, or select a recent local output to restore it.

## Capture To Markdown

The side rail includes a `Capture` tab after `Generate`.

- Capture the visible active browser tab as a screenshot.
- Upload a PNG, JPEG, WebP, or PDF source.
- Send the captured source to the backend extraction API, which uses OpenRouter multimodal chat completions.
- Preview the returned Markdown in the tab.
- Copy or download the Markdown as `.md`.

Images are sent as `image_url` data URLs. PDFs are sent as `file.file_data`
data URLs, and the server defaults the PDF parser plugin to `cloudflare-ai`.

Privacy and limits:

- Visible-tab capture sends the currently visible browser viewport to the
  backend; it does not capture the whole desktop or other apps.
- Uploaded images and PDFs are sent to the backend for AI extraction.
- Sources over 10 MB are rejected.
- Recent Capture entries store generated Markdown and source metadata only; they do not store original screenshot, image, PDF, or base64 bytes.
- DOCX, PPTX, arbitrary desktop capture, and full-page scrolling capture are not
  included in v1.

## Recent Outputs

The `Recent` tab stores local outputs in a discriminated shape:

- generation outputs store `agentType`, context snapshot, title, source title, and Markdown
- capture outputs store source metadata, warnings, title, source title, and Markdown

Selecting a generation output opens `Generate` and restores the agent type, context, and Markdown preview. Selecting a capture output opens `Capture` and restores the source label, warnings, and Markdown preview.

## Access

The extension keeps the existing two-path access model:

- Bring Your Own Key for users with their own OpenRouter API key.
- Author Shared Key for subscribed users who want managed hosted access.

The backend access catalog exposes OpenRouter as the single BYOK provider with `openrouter/auto` as the default model. API keys are stored locally in extension storage and are never committed to tracked files.
