// Runs only on the website's own pages (WEB_ORIGINS). Chrome injects it into pages loaded after install
// (manifest content_scripts); the background also injects it into pages that were already open when the
// extension was installed or reloaded, so the website notices the install without a reload. It tells the
// page that the extension is installed, and passes «Hacerlo con la extensión» requests to the background.
// It reads nothing from the page and accepts only messages the page posts to itself, tagged FROM_WEB.

import { FROM_EXTENSION, FROM_WEB, cleanHandoff } from '../handoff'
import type { HandoffRequest, HandoffResponse } from '../handoff'

const post = (data: Record<string, unknown>) => window.postMessage({ source: FROM_EXTENSION, ...data }, window.location.origin)
/** False once this copy belongs to an extension that was reloaded or removed: it then stays silent. */
const alive = () => typeof chrome !== 'undefined' && !!chrome.runtime?.id
const announce = () => alive() && post({ type: 'ready', version: chrome.runtime.getManifest().version })

// Both injection paths share this isolated world: keep one listener per page.
const FLAG = '__asistenteTramitesBridge'
const scope = globalThis as unknown as Record<string, boolean>

if (!scope[FLAG]) {
  scope[FLAG] = true
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.source !== window || event.origin !== window.location.origin || !alive()) return
    const data = event.data as { source?: unknown; type?: unknown; id?: unknown } | null
    if (!data || data.source !== FROM_WEB) return
    if (data.type === 'ping') return void announce()
    if (data.type !== 'start') return
    const request = cleanHandoff(data)
    if (!request) return
    const id = typeof data.id === 'string' ? data.id.slice(0, 64) : ''
    chrome.runtime
      .sendMessage<HandoffRequest, HandoffResponse>(request)
      .then((response) => post({ type: 'started', id, ...response }))
      .catch(() => alive() && post({ type: 'started', id, ok: false, reason: 'tab' }))
  })
}

announce()
