import { useSyncExternalStore } from "react";

/**
 * Talks to the extension's bridge script (src/web/bridge.ts in the extension), which runs on this
 * site when the extension is installed. Protocol: src/handoff.ts at the repo root.
 *
 *  - On load the web pings; the bridge answers `ready` if the extension is there.
 *  - `startInExtension()` asks it to open the official site in a new tab, with the panel, and start the task.
 */
const FROM_WEB = "asistente-tramites-web";
const FROM_EXTENSION = "asistente-tramites-extension";

export type StartResult =
  | { ok: true; panel: boolean }
  | { ok: false; reason: "origin" | "url" | "tab" | "timeout" | "missing" };

let installed = false;
const listeners = new Set<() => void>();
const waiting = new Map<string, (r: StartResult) => void>();

function onMessage(event: MessageEvent) {
  if (event.source !== window || event.origin !== window.location.origin) return;
  const data = event.data as { source?: string; type?: string; id?: string } & Partial<StartResult>;
  if (data?.source !== FROM_EXTENSION) return;
  if (data.type === "ready" && !installed) {
    installed = true;
    listeners.forEach((l) => l());
  }
  if (data.type === "started" && data.id && waiting.has(data.id)) {
    const { ok, panel, reason } = data as { ok: boolean; panel?: boolean; reason?: string };
    waiting.get(data.id)!(ok ? { ok: true, panel: !!panel } : ({ ok: false, reason } as StartResult));
    waiting.delete(data.id);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("message", onMessage);
  window.postMessage({ source: FROM_WEB, type: "ping" }, window.location.origin);
}

/** True once the extension has answered. */
export function useExtensionInstalled() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => installed
  );
}

let seq = 0;

/** What travels to the extension. The extension trims it and blanks personal data (cleanHandoff in src/handoff.ts). */
export type Handoff = {
  text: string;
  url: string;
  /** The site map procedure, when the web matched one. */
  procedure?: { plugin: string; id: string };
  /** What the person wrote in this chat, oldest first, so the extension doesn't ask again. */
  context?: string[];
};

/** Hands the trámite to the extension. Call it from a click: Chrome needs that gesture to open the panel. */
export function startInExtension(handoff: Handoff): Promise<StartResult> {
  if (!installed) return Promise.resolve({ ok: false, reason: "missing" });
  const id = `h${Date.now().toString(36)}${(seq++).toString(36)}`;
  return new Promise((resolve) => {
    waiting.set(id, resolve);
    window.postMessage({ source: FROM_WEB, type: "start", id, ...handoff }, window.location.origin);
    setTimeout(() => {
      if (waiting.delete(id)) resolve({ ok: false, reason: "timeout" });
    }, 8000);
  });
}
