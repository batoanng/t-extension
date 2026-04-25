# SPECS.md

# Developer Assistant Chrome Extension — Prompt Optimizer

## 1. Overview

This project is a Chrome extension built with **Vite + React + TypeScript**. The extension is designed to assist developers while working with AI coding agents.

The first feature is **Prompt Optimizer**.

The user writes a raw prompt in the extension popup. The extension sends the prompt to the backend server at:

```txt
POST /api/prompt
```

The server uses **LangChain** and the **OpenAI API** to rewrite the prompt into a clearer, more structured, and more effective version for AI coding agents. The optimized prompt is returned to the extension and displayed to the user.

The user must provide their own **OpenAI API key** before using the feature. The extension stores the key locally in the browser and sends it to the server when making the prompt optimization request. The server uses that key only for the current request and must not permanently store it.

---

## 2. Goals

### Primary goal

Build a developer-focused Chrome extension that improves user prompts before sending them to AI coding agents.

### First feature goal

Allow users to:

1. Open the extension popup.
2. Enter their OpenAI API key.
3. Save the API key locally.
4. Type a raw prompt.
5. Send the prompt to the backend server.
6. Receive an improved prompt.
7. Copy the improved prompt for use in another AI agent.

### Future product direction

The extension should be designed so more developer assistant features can be added later, such as:

- Code review prompt generator
- Bug report prompt generator
- Refactoring prompt generator
- Architecture design prompt generator
- Test case prompt generator
- Pull request summary generator
- Context extraction from current webpage
- Integration with GitHub, Jira, Linear, or local docs
- Prompt templates for specific AI agents such as Codex, Claude Code, Cursor, Windsurf, ChatGPT, or Copilot

---

## 3. Non-goals for the first version

The first version should not include:

- User authentication
- Payment or subscription system
- Prompt history sync across devices
- Direct integration with AI coding agents
- Automatic page scraping
- GitHub OAuth
- Team workspace support
- Server-side API key storage
- Complex prompt template marketplace

These can be added later.

---

## 4. Monorepo structure

The existing monorepo has at least:

```txt
repo/
  apps/
    web/
    server/
```

Add a new extension package:

```txt
repo/
  apps/
    web/
    server/
    extension/
```

Recommended final structure:

```txt
repo/
  apps/
    web/
      package.json
      src/
    server/
      package.json
      src/
    extension/
      package.json
      index.html
      vite.config.ts
      public/
        manifest.json
        icons/
          icon16.png
          icon48.png
          icon128.png
      src/
        popup/
          App.tsx
          main.tsx
          styles.css
        components/
          ApiKeyForm.tsx
          PromptEditor.tsx
          OptimizedPromptResult.tsx
        services/
          promptApi.ts
          storage.ts
        types/
          prompt.ts
        utils/
          errors.ts
  package.json
  pnpm-workspace.yaml
  turbo.json
```

---

## 5. High-level architecture

```txt
Chrome Extension Popup
        |
        | User enters raw prompt
        v
Extension React UI
        |
        | POST /api/prompt
        | Header: x-openai-api-key
        v
Server API
        |
        | LangChain prompt chain
        v
OpenAI API
        |
        | Improved prompt
        v
Server API
        |
        | JSON response
        v
Extension React UI
        |
        | Show optimized prompt
        v
User copies result
```

---

## 6. Extension responsibilities

The extension is responsible for:

- Rendering the popup UI
- Asking the user for an OpenAI API key
- Saving the API key locally in the browser
- Letting the user input a raw prompt
- Sending the raw prompt to the server
- Sending the OpenAI API key securely to the server for the current request
- Showing loading, success, and error states
- Displaying the optimized prompt
- Allowing the user to copy the optimized prompt

The extension should not:

- Call OpenAI directly
- Store the API key on any remote server
- Log the API key
- Expose the API key in UI after it is saved
- Store unnecessary user prompt data
- Require broad Chrome permissions for the first version

---

## 7. Server responsibilities

The server is responsible for:

- Exposing `POST /api/prompt`
- Validating the request body
- Reading the OpenAI API key from the request header
- Using LangChain with the provided OpenAI API key
- Creating a better prompt from the user's raw prompt
- Returning the optimized prompt to the extension
- Handling errors safely
- Avoiding API key logging
- Avoiding persistent API key storage

The server should not:

- Save the user’s OpenAI API key
- Log the user’s OpenAI API key
- Log full prompts in production by default
- Use the server’s own OpenAI API key for BYOK requests unless fallback mode is explicitly enabled
- Return raw LangChain/OpenAI error internals to the client

---

## 8. First feature: Prompt Optimizer

### User story

As a developer, I want to enter a rough prompt and receive a clearer, more structured prompt so that an AI coding agent can produce better output.

### Example raw prompt

```txt
fix my react code the page slow and state weird
```

### Example optimized prompt

```txt
You are a senior React and TypeScript engineer.

I have a React page with performance issues and inconsistent state behavior. Please help me debug and improve it.

Please do the following:

1. Identify likely causes of unnecessary re-renders.
2. Review state management patterns that may cause stale or inconsistent state.
3. Suggest specific improvements using React best practices.
4. Provide corrected TypeScript/React code where possible.
5. Explain the reasoning behind each change.

Context:
- Framework: React
- Language: TypeScript
- Problem: Page feels slow and state updates behave unexpectedly

Before proposing a solution, ask me for the relevant component code if more context is required.
```

---

## 9. Extension UI specification

### 9.1 Popup layout

The popup should have a simple vertical layout:

```txt
+------------------------------------------------+
| Developer Assistant                            |
| Prompt Optimizer                               |
+------------------------------------------------+
| OpenAI API Key                                 |
| [••••••••••••••••••••••••] [Save]             |
| Status: API key saved                          |
+------------------------------------------------+
| Raw Prompt                                     |
| [textarea]                                     |
|                                                |
| [Optimize Prompt]                              |
+------------------------------------------------+
| Optimized Prompt                               |
| [textarea/result block]                        |
|                                                |
| [Copy Optimized Prompt]                        |
+------------------------------------------------+
```

### 9.2 UI states

#### No API key saved

- Show API key input.
- Disable `Optimize Prompt`.
- Show helper text:

```txt
Add your OpenAI API key before optimizing prompts.
```

#### API key saved

- Mask the API key.
- Show status:

```txt
API key saved locally.
```

- Show option:

```txt
Replace API key
```

#### Empty prompt

- Disable `Optimize Prompt`.
- Show validation:

```txt
Please enter a prompt first.
```

#### Loading

- Disable inputs.
- Show loading label:

```txt
Optimizing...
```

#### Success

- Show optimized prompt.
- Enable copy button.

#### Error

Show readable error messages:

```txt
Unable to optimize prompt. Please check your API key and try again.
```

For rate limit:

```txt
OpenAI rate limit reached. Please wait and try again.
```

For server unavailable:

```txt
Server is unavailable. Please try again later.
```

---

## 10. Chrome extension permissions

For the first version, avoid page access and content scripts unless needed.

Recommended `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "Developer Assistant",
  "version": "0.1.0",
  "description": "Developer assistant tools for improving prompts and working with AI agents.",
  "action": {
    "default_popup": "index.html",
    "default_title": "Developer Assistant"
  },
  "permissions": ["storage"],
  "host_permissions": [
    "http://localhost:3001/*",
    "https://your-production-domain.com/*"
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

### Permission explanation

| Permission | Reason |
|---|---|
| `storage` | Store the user's OpenAI API key locally in Chrome storage |
| `host_permissions` | Allow the extension to call the backend server API |

Do not add permissions such as `tabs`, `activeTab`, `scripting`, or `<all_urls>` unless later features require reading or modifying webpages.

---

## 11. API key handling

### 11.1 Storage location

The OpenAI API key should be stored in:

```ts
chrome.storage.local
```

Recommended storage key:

```txt
openai_api_key
```

### 11.2 Why local storage in extension

The API key should be stored locally because:

- The user owns the key.
- The server does not need to persist it.
- The first version does not require authentication.
- The user can delete or replace the key anytime.

### 11.3 API key transport

When calling the server, the extension sends the key in a request header:

```txt
x-openai-api-key: sk-...
```

Example:

```ts
await fetch(`${serverBaseUrl}/api/prompt`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-openai-api-key": apiKey
  },
  body: JSON.stringify({
    prompt: rawPrompt,
    mode: "developer-agent"
  })
});
```

### 11.4 Server-side handling

The server must:

- Read the key from `x-openai-api-key`
- Validate that it exists
- Use it only to initialize the OpenAI/LangChain client for that request
- Never write it to logs
- Never save it to a database
- Never return it in API responses

### 11.5 Security warning

Sending the user’s OpenAI API key to the server means the user must trust the server. For production, the extension should clearly tell the user:

```txt
Your OpenAI API key is stored locally in your browser and sent to the configured backend only when optimizing a prompt. The backend uses it for the request and does not store it.
```

### 11.6 Future recommended options

For production SaaS, consider one of these approaches:

1. User authentication + server-owned OpenAI key + quota management
2. User authentication + encrypted user BYOK storage
3. User-provided key stored only locally, sent per request
4. Direct OpenAI call from extension, only if CORS and key exposure risks are acceptable

For this version, use option 3.

---

## 12. API contract

### 12.1 Endpoint

```txt
POST /api/prompt
```

### 12.2 Request headers

```txt
content-type: application/json
x-openai-api-key: <user-openai-api-key>
```

### 12.3 Request body

```ts
type OptimizePromptRequest = {
  prompt: string;
  mode?: "developer-agent";
  targetAgent?: "generic" | "codex" | "claude-code" | "cursor" | "windsurf" | "chatgpt";
  outputStyle?: "structured" | "concise" | "detailed";
};
```

### 12.4 Example request

```json
{
  "prompt": "fix my react code the page slow and state weird",
  "mode": "developer-agent",
  "targetAgent": "generic",
  "outputStyle": "structured"
}
```

### 12.5 Success response

```ts
type OptimizePromptResponse = {
  optimizedPrompt: string;
  metadata: {
    model: string;
    targetAgent: string;
    outputStyle: string;
  };
};
```

### 12.6 Example success response

```json
{
  "optimizedPrompt": "You are a senior React and TypeScript engineer...\n\nPlease help me debug...",
  "metadata": {
    "model": "gpt-4o-mini",
    "targetAgent": "generic",
    "outputStyle": "structured"
  }
}
```

### 12.7 Error response

```ts
type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};
```

### 12.8 Example error response

```json
{
  "error": {
    "code": "MISSING_OPENAI_API_KEY",
    "message": "OpenAI API key is required."
  }
}
```

---

## 13. Error codes

| Code | HTTP status | Meaning |
|---|---:|---|
| `MISSING_OPENAI_API_KEY` | 401 | The request does not include an OpenAI API key |
| `INVALID_REQUEST` | 400 | Prompt is missing or invalid |
| `PROMPT_TOO_LONG` | 400 | Prompt exceeds allowed length |
| `OPENAI_AUTH_FAILED` | 401 | OpenAI rejected the API key |
| `OPENAI_RATE_LIMITED` | 429 | OpenAI rate limit reached |
| `OPENAI_REQUEST_FAILED` | 502 | OpenAI request failed |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

---

## 14. Prompt improvement behavior

The server should rewrite the prompt using this strategy:

### 14.1 Improvements to apply

The optimized prompt should:

- Clarify the role the AI agent should play
- Add missing context placeholders
- Convert vague requests into specific instructions
- Break work into ordered steps
- Ask the AI agent to explain reasoning where useful
- Ask the AI agent to provide code when relevant
- Ask the AI agent to request missing information instead of guessing
- Preserve the user’s original intent
- Avoid adding fake details that the user did not provide
- Be practical for coding agents

### 14.2 The optimized prompt should include

When relevant:

```txt
Role
Task
Context
Requirements
Constraints
Expected Output
Files or Code Needed
Acceptance Criteria
```

### 14.3 The optimized prompt should not

- Invent project details
- Add unsupported technologies
- Add fake file names
- Change the user's goal
- Make the prompt unnecessarily long
- Include private implementation notes
- Include system-level instructions that pretend to override the AI agent's policies

---

## 15. LangChain server implementation specification

### 15.1 Recommended server stack

Assuming the server is a Node.js/NestJS package:

```txt
apps/server/
  src/
    prompt/
      prompt.module.ts
      prompt.controller.ts
      prompt.service.ts
      dto/
        optimize-prompt.dto.ts
```

### 15.2 Controller

The controller should expose:

```txt
POST /api/prompt
```

Responsibilities:

- Read `x-openai-api-key`
- Validate request body
- Call `PromptService.optimizePrompt`
- Return JSON response

### 15.3 Service

The service should:

- Create a LangChain OpenAI model instance using the user-provided API key
- Build the system prompt
- Pass user input to the model
- Return a clean optimized prompt

Pseudo-code:

```ts
async optimizePrompt(input: {
  rawPrompt: string;
  apiKey: string;
  targetAgent?: string;
  outputStyle?: string;
}) {
  const model = new ChatOpenAI({
    apiKey: input.apiKey,
    model: "gpt-4o-mini",
    temperature: 0.2
  });

  const result = await model.invoke([
    {
      role: "system",
      content: PROMPT_OPTIMIZER_SYSTEM_PROMPT
    },
    {
      role: "user",
      content: input.rawPrompt
    }
  ]);

  return {
    optimizedPrompt: result.content
  };
}
```

### 15.4 System prompt

Recommended system prompt:

```txt
You are a senior software engineering prompt architect.

Your task is to rewrite the user's rough prompt into a clearer, more structured, and more effective prompt for an AI coding agent.

Rules:
- Preserve the user's original intent.
- Do not invent facts, technologies, file names, APIs, or requirements that the user did not provide.
- If information is missing, include explicit placeholders or ask the AI agent to request clarification.
- Make the prompt actionable for coding work.
- Prefer a structured format with sections.
- Keep the result practical and not overly verbose.
- Do not include explanations about how you rewrote the prompt.
- Return only the improved prompt.

The improved prompt should usually include:
- Role
- Task
- Context
- Requirements
- Constraints
- Expected output
- Acceptance criteria
```

---

## 16. Extension implementation specification

### 16.1 Vite setup

Create the extension app:

```bash
cd apps
npm create vite@latest extension -- --template react-ts
```

Or with pnpm:

```bash
cd apps
pnpm create vite extension --template react-ts
```

### 16.2 Package scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "package:chrome": "pnpm build && node scripts/package-extension.mjs"
  }
}
```

### 16.3 Vite config

The Vite build should output files into `dist`.

Recommended:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true
  }
});
```

### 16.4 Prompt API service

```ts
export type OptimizePromptRequest = {
  prompt: string;
  mode?: "developer-agent";
  targetAgent?: "generic" | "codex" | "claude-code" | "cursor" | "windsurf" | "chatgpt";
  outputStyle?: "structured" | "concise" | "detailed";
};

export type OptimizePromptResponse = {
  optimizedPrompt: string;
  metadata?: {
    model?: string;
    targetAgent?: string;
    outputStyle?: string;
  };
};

export async function optimizePrompt(params: {
  serverBaseUrl: string;
  apiKey: string;
  payload: OptimizePromptRequest;
}): Promise<OptimizePromptResponse> {
  const response = await fetch(`${params.serverBaseUrl}/api/prompt`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-openai-api-key": params.apiKey
    },
    body: JSON.stringify(params.payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Failed to optimize prompt.");
  }

  return data;
}
```

### 16.5 Chrome storage service

```ts
const OPENAI_API_KEY_STORAGE_KEY = "openai_api_key";

export async function saveOpenAIApiKey(apiKey: string): Promise<void> {
  await chrome.storage.local.set({
    [OPENAI_API_KEY_STORAGE_KEY]: apiKey
  });
}

export async function getOpenAIApiKey(): Promise<string | null> {
  const result = await chrome.storage.local.get(OPENAI_API_KEY_STORAGE_KEY);
  return result[OPENAI_API_KEY_STORAGE_KEY] ?? null;
}

export async function removeOpenAIApiKey(): Promise<void> {
  await chrome.storage.local.remove(OPENAI_API_KEY_STORAGE_KEY);
}
```

---

## 17. Configuration

### 17.1 Extension environment variables

For local development:

```txt
VITE_SERVER_BASE_URL=http://localhost:3001
```

For production:

```txt
VITE_SERVER_BASE_URL=https://api.your-domain.com
```

### 17.2 Server environment variables

The server does not need a default OpenAI key for BYOK mode.

Recommended:

```txt
NODE_ENV=development
PORT=3001
CORS_ALLOWED_ORIGINS=http://localhost:5173,chrome-extension://<extension-id>
```

Optional fallback mode:

```txt
OPENAI_API_KEY=
ALLOW_SERVER_OPENAI_KEY_FALLBACK=false
```

---

## 18. CORS requirements

The server must allow requests from the Chrome extension origin.

During development, the extension origin changes depending on how it is loaded.

For production, once the extension is published, allow:

```txt
chrome-extension://<published-extension-id>
```

For local development, also allow:

```txt
http://localhost:5173
```

If loading the built extension through `chrome://extensions`, requests may come from:

```txt
chrome-extension://<local-extension-id>
```

For early development, it is acceptable to allow extension origins with a controlled pattern, but production should be stricter.

---

## 19. Data privacy requirements

The product should communicate clearly:

- The OpenAI API key is stored locally in the browser.
- The key is sent to the configured backend only when the user clicks optimize.
- The backend does not store the key.
- The raw prompt is sent to the backend for processing.
- The prompt is sent to OpenAI using the user's key.
- The extension does not collect browser history.
- The extension does not read webpage content in the first version.

Production privacy policy should include:

- What data is collected
- Why it is collected
- Where it is processed
- Whether it is stored
- How the user can remove their key
- Contact details

---

## 20. Logging requirements

### Extension logging

Allowed in development:

```ts
console.log("Prompt optimized");
```

Not allowed:

```ts
console.log(apiKey);
console.log(fullPrompt);
```

### Server logging

Allowed:

```txt
Prompt optimization request received
Prompt optimization completed
OpenAI request failed with status 429
```

Not allowed:

```txt
User API key: sk-...
Raw prompt: ...
Optimized prompt: ...
```

In production, avoid logging full prompt content unless the user explicitly opts in for debugging.

---

## 21. Validation rules

### API key validation

Extension-side:

- Required before enabling prompt optimization
- Should start with likely OpenAI key prefix, but do not rely only on prefix
- Trim whitespace

Server-side:

- Required
- Must be non-empty
- Should not be logged
- Invalid keys should return `OPENAI_AUTH_FAILED`

### Prompt validation

Extension-side:

- Required
- Minimum length: 3 characters
- Maximum length: 8,000 characters for first version

Server-side:

- Required
- Must be string
- Trim whitespace
- Maximum length: 8,000 characters

---

## 22. Rate limiting

For the first version, because the user supplies their own OpenAI key, server-side rate limiting is still useful to prevent abuse.

Recommended simple limits:

```txt
10 requests per minute per extension/client IP
100 requests per day per extension/client IP
```

Future authenticated version can rate limit by user ID.

---

## 23. Error handling UX

The extension should map server errors to user-friendly messages.

| Server error | UI message |
|---|---|
| `MISSING_OPENAI_API_KEY` | Please add your OpenAI API key first. |
| `INVALID_REQUEST` | Please enter a valid prompt. |
| `PROMPT_TOO_LONG` | Your prompt is too long. Please shorten it. |
| `OPENAI_AUTH_FAILED` | Your OpenAI API key appears to be invalid. |
| `OPENAI_RATE_LIMITED` | Your OpenAI account is rate limited. Please try again later. |
| `OPENAI_REQUEST_FAILED` | OpenAI could not process the request. Please try again. |
| `INTERNAL_SERVER_ERROR` | Something went wrong. Please try again. |

---

## 24. Local development workflow

### 24.1 Start server

```bash
pnpm --filter server dev
```

Expected server URL:

```txt
http://localhost:3001
```

### 24.2 Start extension development

```bash
pnpm --filter extension dev
```

For normal web development, Vite will run on:

```txt
http://localhost:5173
```

However, to test Chrome extension behavior, build and load the extension:

```bash
pnpm --filter extension build
```

Then:

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select `apps/extension/dist`
5. Pin the extension
6. Open the popup

### 24.3 Rebuild after changes

After changing extension source code:

```bash
pnpm --filter extension build
```

Then refresh the extension from `chrome://extensions`.

---

## 25. Production build workflow

```bash
pnpm --filter extension build
pnpm --filter extension package:chrome
```

Expected output:

```txt
apps/extension/release/developer-assistant-extension.zip
```

The ZIP should contain:

```txt
manifest.json
index.html
assets/
icons/
```

`manifest.json` must be at the root of the ZIP.

---

## 26. Chrome Web Store readiness checklist

Before publishing:

- [ ] Extension uses Manifest V3
- [ ] Extension has a clear single purpose
- [ ] Only required permissions are requested
- [ ] API key behavior is explained clearly
- [ ] Privacy policy is available
- [ ] Screenshots are prepared
- [ ] Extension icon is prepared in required sizes
- [ ] Production API URL is configured
- [ ] Server CORS allows the extension origin
- [ ] Server does not log API keys
- [ ] Server does not store API keys
- [ ] User can remove or replace their API key
- [ ] Error handling is user-friendly
- [ ] ZIP package has `manifest.json` at root
- [ ] Version number is correct

---

## 27. Acceptance criteria for first version

### API key

- [ ] User can enter an OpenAI API key.
- [ ] User can save the API key.
- [ ] User can replace the API key.
- [ ] User can remove the API key.
- [ ] The key is stored in `chrome.storage.local`.
- [ ] The key is not shown in plain text after saving.

### Prompt optimizer

- [ ] User can enter a raw prompt.
- [ ] `Optimize Prompt` is disabled when there is no API key.
- [ ] `Optimize Prompt` is disabled when the prompt is empty.
- [ ] Extension calls `POST /api/prompt`.
- [ ] Extension sends `x-openai-api-key`.
- [ ] Server uses LangChain and OpenAI.
- [ ] Server returns `optimizedPrompt`.
- [ ] Extension displays the optimized prompt.
- [ ] User can copy the optimized prompt.
- [ ] Loading state works.
- [ ] Error state works.

### Security

- [ ] Server does not persist OpenAI API key.
- [ ] Server does not log OpenAI API key.
- [ ] Extension only requests required Chrome permissions.
- [ ] Extension does not read current webpage content in first version.
- [ ] API calls use HTTPS in production.

---

## 28. Future feature roadmap

### Version 0.2

- Add prompt templates:
  - Bug fix
  - Code review
  - Refactor
  - Test generation
  - System design
  - Debug production issue

### Version 0.3

- Add target agent selector:
  - Generic AI agent
  - Codex
  - Claude Code
  - Cursor
  - Windsurf
  - ChatGPT

### Version 0.4

- Add prompt history saved locally.

### Version 0.5

- Add current webpage context extraction.

This will require new permissions:

```json
{
  "permissions": ["activeTab", "scripting"]
}
```

### Version 0.6

- Add GitHub integration.
- Generate pull request review prompts.
- Generate issue investigation prompts.

### Version 1.0

- Add user accounts.
- Add server-side prompt history.
- Add usage limits.
- Add team templates.
- Add subscription plans.

---

## 29. Suggested implementation order

1. Create `apps/extension`.
2. Add Manifest V3 config.
3. Build static React popup.
4. Add API key form.
5. Add Chrome storage service.
6. Add raw prompt textarea.
7. Add API client for `POST /api/prompt`.
8. Add server endpoint.
9. Add LangChain/OpenAI service.
10. Add error handling.
11. Add copy-to-clipboard.
12. Add production config.
13. Add package script for Chrome ZIP.
14. Test locally through `chrome://extensions`.
15. Prepare Chrome Web Store listing.

---

## 30. Open questions

These can be decided during implementation:

1. Should the extension support multiple AI providers later?
2. Should the server support both BYOK and server-owned API key modes?
3. Should optimized prompts be saved locally?
4. Should users be able to choose the target AI agent?
5. Should the extension support project-specific prompt profiles?
6. Should prompt templates be hardcoded first or loaded from the server?
7. Should prompt optimization stream back token-by-token or return only final output?
8. Should the extension include a side panel in addition to popup UI?

---

## 31. Recommended first version name

Product name options:

```txt
Developer Assistant
PromptPilot
AgentPrompt
PromptForge
DevPrompt Helper
CodePrompt Assistant
```

Recommended first version:

```txt
Developer Assistant
```

Reason:

- Broad enough for future features
- Not limited to prompt optimization
- Clear for Chrome Web Store listing
- Suitable for developer-focused tooling

---

## 32. Summary

The first version should be a focused Chrome extension with one useful feature:

```txt
Raw developer prompt → Server /api/prompt → LangChain + OpenAI → Better AI-agent prompt
```

The extension should be simple, secure, and easy to extend. The OpenAI API key should stay under user control, stored locally in the browser, and sent to the backend only when the user explicitly optimizes a prompt.

The implementation should prioritize:

1. Clear UX
2. Minimal Chrome permissions
3. Safe API key handling
4. Clean API contract
5. Extensible architecture for future developer-assistant features
