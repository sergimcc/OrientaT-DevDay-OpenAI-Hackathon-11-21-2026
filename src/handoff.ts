// Hand-off from the website to the extension. The website (web/) is where people find out which trámite
// they need; when they press «Hacerlo con la extensión», the extension opens the official site in a new
// tab, opens its panel there and starts the task, so the person lands inside the site with the guide on.
//
//   web page ──postMessage──▶ bridge (content script, only on WEB_ORIGINS)
//            ──runtime.sendMessage──▶ background: checks the URL is a site the assistant may use,
//            opens it in a new tab, opens the panel, and leaves the task in session storage for that tab
//   panel ──on that tab──▶ reads the task and sends it as the first message.

/** Origins of the website that may hand tasks to the extension. build.mjs reads this list for the manifest. */
export const WEB_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

/** `source` tags on window messages, so neither side reacts to anything else the page posts. */
export const FROM_WEB = 'asistente-tramites-web'
export const FROM_EXTENSION = 'asistente-tramites-extension'

/** What the website asks the extension to do. */
export type HandoffRequest = {
  type: 'handoff'
  /** The trámite, in the person's words or the site map's title («Pedir cita para el DNI o el pasaporte»). */
  text: string
  /** Where to start: the procedure's entry_url on an official site. */
  url: string
  /** The site map procedure the web matched, so the assistant can open it with get_procedure straight away. */
  procedure?: { plugin: string; id: string }
  /** What the person wrote on the website, oldest first, with personal data already blanked (cleanHandoff). */
  context?: string[]
}

export type HandoffResponse = { ok: true; panel: boolean } | { ok: false; reason: 'origin' | 'url' | 'tab' }

/** A task waiting for the panel to pick it up on its tab. */
export type PendingTask = Omit<HandoffRequest, 'type'> & { at: number }

export const pendingKey = (tabId: number) => `handoff:${tabId}`

/** Tasks older than this are dropped rather than started by surprise. */
export const PENDING_TTL_MS = 10 * 60 * 1000

/** How much of the website conversation travels with the task. */
export const HANDOFF_LIMITS = { text: 300, contextItems: 6, contextItem: 400 }

const BLANK = '[dato personal]'
// The assistant never asks for or repeats identity numbers (src/policy.ts); whatever the person typed on
// the website is blanked here, before it reaches session storage or the model.
const PERSONAL_DATA: RegExp[] = [
  /\b[XYZ][\s.-]?\d{7}[\s.-]?[A-Z]\b/gi, // NIE
  /\b\d{2}[.\s]?\d{3}[.\s]?\d{3}[\s-]?[A-Z]\b/gi, // DNI, also 12.345.678-Z
  /\b[A-Z]{2}\d{2}(?:[\s]?[A-Z0-9]{4}){4,7}\b/gi, // IBAN
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, // email
  /\b\d{2}[\s/-]?\d{8}[\s/-]?\d{2}\b/g, // Seguridad Social number
  /(?:\+34[\s-]?)?\b[6-9]\d{2}[\s-]?(?:\d{3}[\s-]?\d{3}|\d{2}[\s-]?\d{2}[\s-]?\d{2})\b/g, // Spanish phone numbers
]

export function redactPersonalData(text: string): string {
  return PERSONAL_DATA.reduce((out, re) => out.replace(re, BLANK), text)
}

const ID = /^[a-z0-9][a-z0-9-]{0,59}$/

/**
 * Checks and trims a hand-off from the website. The bridge and the background both run it: the website is
 * another origin, so nothing it sends is trusted as is. Returns null when the required fields are missing.
 */
export function cleanHandoff(raw: unknown): HandoffRequest | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.text !== 'string' || typeof r.url !== 'string' || !r.text.trim()) return null
  const request: HandoffRequest = { type: 'handoff', text: redactPersonalData(r.text.trim()).slice(0, HANDOFF_LIMITS.text), url: r.url }
  const p = r.procedure as Record<string, unknown> | undefined
  if (p && typeof p.plugin === 'string' && typeof p.id === 'string' && ID.test(p.plugin) && ID.test(p.id)) {
    request.procedure = { plugin: p.plugin, id: p.id }
  }
  if (Array.isArray(r.context)) {
    const context = r.context
      .filter((c): c is string => typeof c === 'string' && !!c.trim())
      .slice(-HANDOFF_LIMITS.contextItems)
      .map((c) => redactPersonalData(c.trim().replace(/\s+/g, ' ')).slice(0, HANDOFF_LIMITS.contextItem))
    if (context.length) request.context = context
  }
  return request
}

/** How the panel phrases the hand-off to the assistant. */
export function handoffMessage(task: PendingTask): string {
  const lines = [`Vengo de la web del Asistente de trámites. Quiero hacer esto: ${task.text}. Ya estoy en la web oficial (${task.url}); guíame desde aquí.`]
  if (task.procedure) lines.push(`La web lo ha encontrado en el mapa ${task.procedure.plugin} / ${task.procedure.id}.`)
  if (task.context?.length) {
    lines.push('', 'Esto es lo que te conté en la web, para que no me lo vuelvas a preguntar:', ...task.context.map((c) => `- ${c}`))
  }
  return lines.join('\n')
}
