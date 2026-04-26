# Developer Assistant Extension

Chrome extension popup built with React, TypeScript, and Vite.

## Scripts

- `pnpm dev` runs the popup preview locally on `http://localhost:3001` by default.
- `pnpm build` builds the popup and generates `dist/manifest.json` plus extension icons from `assets/logo.png`.
- `pnpm package:chrome` zips the built extension to `release/developer-assistant-extension.zip`.
- `pnpm lint`
- `pnpm test`
- `pnpm type-check`

## Environment

```bash
VITE_APP_PORT=3001
VITE_SERVER_BASE_URL=http://localhost:3000
```

`VITE_SERVER_BASE_URL` should point to the backend origin only. The popup calls
`POST /api/v1/prompt/optimize` under that origin.

## Local Workflow

1. Start the server in `apps/server` on port `3000`.
2. Run `pnpm --filter developer-assistant-extension dev`.
3. For Chrome testing, run `pnpm --filter developer-assistant-extension build`.
4. Open `chrome://extensions`, enable Developer Mode, then load
   `/Users/batoannguyen/Downloads/PROJECTS/personal/t-extension/apps/extension/dist`.
