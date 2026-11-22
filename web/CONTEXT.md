# Website implementation notes

The [main README](../README.md) describes the product and local demo. This file explains the website's current implementation for contributors.

## Interface and data

- `src/App.tsx` uses AI SDK `useChat` with `MockTramitesTransport` from `src/lib/mock-transport.ts`. The transport produces UI message chunks for plans, procedure cards, explanations, and sources. The visible website chat is deterministic and does not call OpenAI.
- `src/data/tramites.ts` provides a catalog of common procedures. `src/lib/extension-catalog.ts` imports the same `../plugins/*.json` site maps used by the extension and builds mapped procedure plans.
- `src/components/chat/tool-cards.tsx` renders plans and procedure cards. The handoff button passes the selected task to the extension through `src/lib/extension-bridge.ts`.
- The interface supports Spanish, Catalan, Basque, Galician, and English through `src/i18n/`. Spanish is the type reference for the other message files.

## Handoff to the extension

The browser extension's content script (`../src/web/bridge.ts`) is injected only on origins listed in `../src/handoff.ts`. The website asks whether the extension is installed and, on a person's click, sends a selected procedure and limited conversation context. The background script validates the destination, opens the official site, and associates the task with the new tab. `cleanHandoff()` masks common personal identifiers and limits the context; still, users should not put private data in chat.

The side panel reads the pending task and uses the relevant JSON map and the live official page. If the panel cannot open automatically, the extension displays a badge for the new tab. For a deployed website, add its exact origin to `WEB_ORIGINS`, rebuild the manifest, and review the resulting host permissions.

## Local APIs and voice

`vite.config.ts` registers `server/chat.ts` and `server/voice.ts`. `/api/extension` adapts the extension agent's requests to OpenAI Responses API and keeps `OPENAI_API_KEY` in the local server process. `/api/chat` is available as a separate text endpoint but is not used by the current website chat. Voice uses ElevenLabs server credentials for short lived speech sessions and synthesis; it feeds transcription back into the existing chat logic.

The local API binds to `127.0.0.1:5173` because requests can consume a paid key. It is not a production authentication layer. Never commit `.env.local` or expose the development server to other devices.

## Check changes

From the repository root:

```powershell
npm --prefix web ci
npm --prefix web run lint
npm --prefix web run build
npm test
```
