# OneAgent Chrome Extension

OneAgent lets developers easily run the most effective public AI agents over their page content or screen captures, visualize that output as diagrams/mind maps, and chain agents into sequences.

## MVP Flow

- Use `Generate` to paste or type content, refresh page text, or capture the visible browser tab as Markdown.
- Choose an agent from the backend-owned agent list. `planner` is the default, with `ci-expert`, `data-analyst`, `design-architect`, and `security-architect` also available.
- Open the selected agent's full details in the companion web app with `View agent details`.
- Generate the matching Markdown through the OneAgent backend and OpenRouter.
- Use `Visualize` to create Mermaid graphs or mind maps from saved Markdown outputs.
- Use `Sequence` to run selected agents in order, passing each output to the next agent.
- Copy the Markdown, download it as `.md`, or select/delete recent local outputs.

## Tabs

The side rail order is `Generate`, `Visualize`, `Sequence`, `Access`, `Recent`, and `Support`.

### Generate

- Paste or type content into the editable content field.
- Refresh page text from the active tab when available.
- Capture the visible active browser tab as a screenshot.
- Send the screenshot to the backend extraction API, which uses OpenRouter multimodal chat completions.
- Append extracted Markdown to the editable content field.
- Generate, copy, or download the final agent-specific Markdown.

The previous read-only context preview is removed. The editable content field is the source of truth for generation.

### Visualize

- Select one or more saved Recent outputs.
- Create an LLM-generated Mermaid graph or mind map through `POST /api/v1/visualizations`.
- Preview the rendered Mermaid diagram and copy the Mermaid source.

### Sequence

- Select one or more agents from the backend-owned agent list.
- Reorder selected agents with move controls.
- Run the new content synchronously through each selected agent.
- Pass each step output as the next step input.
- Save only the final sequence output to Recent.

Privacy and limits:

- Visible-tab capture sends the currently visible browser viewport to the
  backend; it does not capture the whole desktop or other apps.
- Captured images are sent as `image_url` data URLs.
- Recent Capture entries store generated Markdown and source metadata only; they do not store original screenshot, image, PDF, or base64 bytes.
- DOCX, PPTX, PDF upload, arbitrary desktop capture, and full-page scrolling capture are not
  included in v1.

## Recent Outputs

The `Recent` tab stores local outputs in a discriminated shape:

- generation outputs store `agentType`, context snapshot, title, source title, and Markdown
- capture outputs store source metadata, warnings, title, source title, and Markdown

Selecting a generation output opens `Generate` and restores the agent type, content, and Markdown preview. Selecting a capture output opens `Generate` and restores the captured Markdown into the editable content field. Users can delete outputs they no longer want to persist.

## Access

The extension keeps the existing two-path access model:

- Bring Your Own Key for users with their own OpenRouter API key.
- Author Shared Key for subscribed users who want managed hosted access.

The backend access catalog exposes OpenRouter as the single BYOK provider with `openrouter/auto` as the default model. API keys are stored locally in extension storage and are never committed to tracked files.
