# ContextPackAI Chrome Extension

ContextPackAI turns browser work context from Jira, Linear, GitHub Issues, selected text, or manual notes into role-specific markdown briefs for software teams.

## MVP Flow

- Extract the current page or selected text.
- Choose a target role: Developer, Tester / QA, Business Analyst, Project Manager, or Designer.
- Generate the matching brief through the ContextPackAI backend.
- Copy the markdown, download it as `.md`, or reuse a recent local output.

## Capture To Markdown

The side rail includes a `Capture` tab after `Generate`.

- Capture the visible active browser tab as a screenshot.
- Upload a PNG, JPEG, WebP, or PDF source.
- Send the captured source to the backend extraction API.
- Preview the returned Markdown in the tab.
- Copy or download the Markdown as `.md`.

Capture to Markdown v1 supports OpenAI only. BYOK users must select OpenAI in
Access. Shared hosted extraction uses the server's configured OpenAI key when
available.

Privacy and limits:

- Visible-tab capture sends the currently visible browser viewport to the
  backend; it does not capture the whole desktop or other apps.
- Uploaded images and PDFs are sent to the backend for AI extraction.
- Sources over 10 MB are rejected.
- DOCX, PPTX, arbitrary desktop capture, and full-page scrolling capture are not
  included in v1.

## Access

The extension keeps the existing two-path access model:

- Bring Your Own Key for users with their own supported provider account.
- Author Shared Key for subscribed users who want managed hosted access.

Provider and model options are loaded from the backend access catalog so the extension does not need a store release for catalog updates.
