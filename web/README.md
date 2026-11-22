# OrientaT website

The [main README](../README.md) explains the project, the hackathon, the team, and the demo.

This directory contains a React, TypeScript, and Vite application with its own `package.json` and lockfile. The visible chat uses [`MockTramitesTransport`](src/lib/mock-transport.ts) to produce catalog based replies and plans from [`../plugins/`](../plugins/). The current website interface does not call OpenAI for chat responses.

The development server registers [`/api/extension`](server/chat.ts), which serves the Chrome side panel using a key held by the local process. `/api/chat` also exists as a text endpoint, but the current interface does not use it. Voice support is configured in [`server/voice.ts`](server/voice.ts).

Run from the repository root:

```powershell
npm --prefix web ci
npm --prefix web run dev
```

Open <http://127.0.0.1:5173/>. To use the extension agent with OpenAI, create `web/.env.local` from [`.env.example`](.env.example), set `OPENAI_API_KEY`, and restart Vite. Do not commit keys. Check the website with:

```powershell
npm --prefix web run lint
npm --prefix web run build
```
