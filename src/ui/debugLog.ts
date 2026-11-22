// A record of what the extension did, for reporting problems from a live run. It is kept in memory
// only, for this panel session, and leaves the browser only when the person downloads or copies it.
// It holds page outlines (field values are never in them, and identifiers are masked) and the chat.

declare const __BUILD__: string
/** When this bundle was built. */
export const BUILD: string = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev'

const MAX_EVENTS = 400
const MAX_TEXT = 6000

type Event = { at: string; kind: string; data: unknown }

const events: Event[] = []
let transcript: () => unknown = () => []

function clip(value: unknown): unknown {
  if (typeof value === 'string') return value.length > MAX_TEXT ? `${value.slice(0, MAX_TEXT)}… [${value.length - MAX_TEXT} more chars]` : value
  if (Array.isArray(value)) return value.map(clip)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, clip(inner)]))
  return value
}

export function record(kind: string, data: unknown): void {
  events.push({ at: new Date().toISOString(), kind, data: clip(data) })
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS)
}

/** The conversation as the panel shows it, read at export time. */
export function setTranscriptSource(source: () => unknown): void {
  transcript = source
}

function parse(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** Run one tool call and keep its arguments, result and duration. */
export async function recorded(name: string, args: string, run: () => Promise<string>): Promise<string> {
  const started = performance.now()
  try {
    const result = await run()
    record('tool', { name, args: parse(args), ms: Math.round(performance.now() - started), result: parse(result) })
    return result
  } catch (e) {
    record('tool_error', { name, args: parse(args), ms: Math.round(performance.now() - started), error: e instanceof Error ? e.message : String(e) })
    throw e
  }
}

export function exportLog(meta: Record<string, unknown>): string {
  const manifest = chrome.runtime.getManifest()
  return JSON.stringify(
    {
      extension: { version: manifest.version, build: BUILD, userAgent: navigator.userAgent },
      exported_at: new Date().toISOString(),
      ...meta,
      events,
      transcript: clip(transcript()),
    },
    null,
    2,
  )
}

export function downloadLog(meta: Record<string, unknown>): void {
  const url = URL.createObjectURL(new Blob([exportLog(meta)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `asistente-tramites-log-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
