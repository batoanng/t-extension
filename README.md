# ContextPackAI Chrome Extension

ContextPackAI turns browser work context from Jira, Linear, GitHub Issues, selected text, or manual notes into role-specific markdown briefs for software teams.

## MVP Flow

- Extract the current page or selected text.
- Choose a target role: Developer, Tester / QA, Business Analyst, Project Manager, or Designer.
- Generate the matching brief through the ContextPackAI backend.
- Copy the markdown, download it as `.md`, or reuse a recent local output.

## Access

The extension keeps the existing two-path access model:

- Bring Your Own Key for users with their own supported provider account.
- Author Shared Key for subscribed users who want managed hosted access.

Provider and model options are loaded from the backend access catalog so the extension does not need a store release for catalog updates.
