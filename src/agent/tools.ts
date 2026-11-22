import { z } from 'zod'
import type { BetaTool } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import type { ClickResult, Outline, TableData } from '../page/dom'
import type { PageRequest } from '../page/messages'
import { REFUSAL, isOfficialUrl } from '../policy'
import type { ControlClass } from '../policy'
import { PLUGINS, formsOf, pluginById, pluginForUrl, searchProcedures } from '../plugins/registry'
import type { PanelForm, SitePlugin } from '../plugins/schema'
import { probePageForm } from './formFill'
import { hostOf, trustOf, trustedHosts } from '../trust'

// The assistant's tools. There is deliberately no tool that types, ticks, chooses, uploads or submits:
// the only things it can do on a page are read it, open a trusted address, press a control that moves
// around the site, and point at a control for the person. Every input is validated here before it runs.
//
// show_form is not an exception: it names a form that the site map declares, and nothing else. The panel
// shows that form, the person types, and the panel copies the values to the page (formFill.ts). No value
// passes through a tool input or a tool result.
//
// Finding a procedure: the site maps answer first (find_procedure); for anything they do not cover the
// model uses Claude's web search (a server tool, declared in agent.ts) and then open_page. A site that is
// neither mapped nor a public-administration domain opens only after the person approves it.

export type Tab = { id: number; url: string; title: string }

/** What the tools need from the browser. `chromeBrowser.ts` is the real one; the tests use a fake. */
export interface Browser {
  activeTab(): Promise<Tab | null>
  /** Frame ids the page script could be injected into, the top frame (0) first. */
  frames(tabId: number): Promise<number[]>
  page<T>(tabId: number, request: PageRequest, frameId?: number): Promise<T>
  navigate(tabId: number, url: string): Promise<Tab>
}

/** A panel form to show: the map's form, and which of its fields the open page has. */
export type FormRequest = { tabId: number; form: PanelForm; present: string[] }
/** What happened with it, by field id. Never the values. */
export type FormOutcome = { status: 'filled'; filled: string[]; failed: string[] } | { status: 'declined' }

export type ToolHost = {
  browser: Browser
  /** Shows a question card and resolves with what the person chose or wrote. */
  ask(question: string, options: string[]): Promise<string>
  /**
   * Asks the person whether to trust a site the assistant found, and resolves true once they approved it
   * (and the browser granted access). The approved host then counts as trusted for this session.
   */
  approveSite(url: string, reason: string): Promise<boolean>
  /**
   * Shows a panel form, copies what the person typed into the page, and resolves with which fields were
   * filled. The values stay between the panel and the page.
   */
  showForm?(request: FormRequest): Promise<FormOutcome>
  /** Hosts the person approved in this session. */
  approvedHosts(): string[]
  wait?(ms: number): Promise<void>
  plugins?: SitePlugin[]
}

/** What the last read of the page said about each control, by ref. The click tool checks it. */
export class ToolState {
  classes = new Map<string, ControlClass>()
  url = ''
  reset(url = ''): void {
    this.classes.clear()
    this.url = url
  }
}

export type ToolOutcome = { content: string; isError: boolean; pointed?: boolean }

const ref = z.string().regex(/^(f\d+:)?[et]\d+$/, 'una referencia como e12 o f3:e12').describe('La referencia del elemento tal como aparece en read_page, por ejemplo e12 o f3:e12.')

export const TOOL_INPUTS = {
  find_procedure: z.strictObject({
    query: z.string().min(2).max(200).describe('Lo que la persona quiere hacer, con sus palabras: "renovar el DNI", "alquiler asequible".'),
  }),
  get_procedure: z.strictObject({
    plugin_id: z.string().min(1).max(60),
    procedure_id: z.string().min(1).max(60),
  }),
  read_page: z.strictObject({
    query: z.string().max(100).optional().describe('Opcional: solo las líneas que contengan este texto (y sus vecinas).'),
  }),
  open_page: z.strictObject({
    url: z.string().max(500).describe('Dirección https de una web oficial.'),
    reason: z.string().min(2).max(200).describe('Por qué esta es la web oficial correcta, en una frase para la persona. Se le muestra si tiene que aprobar la web.'),
  }),
  click: z.strictObject({
    ref,
    reason: z.string().min(2).max(140).describe('Para qué lo pulsas, en pocas palabras, en español. Se le muestra a la persona.'),
  }),
  point_to: z.strictObject({
    ref,
    instruction: z.string().min(2).max(140).describe('Una instrucción corta para la persona, en segunda persona: "Escribe aquí tu número de DNI", "Pulsa Confirmar cuando lo hayas revisado".'),
  }),
  show_form: z.strictObject({
    form_id: z.string().min(1).max(60).describe('El identificador del formulario del panel, tal como lo da get_procedure en el paso.'),
  }),
  ask_user: z.strictObject({
    question: z.string().min(2).max(300),
    options: z.array(z.string().min(1).max(80)).max(6).describe('Respuestas rápidas. La persona también puede escribir otra cosa.'),
  }),
} as const

export type ToolName = keyof typeof TOOL_INPUTS

const DESCRIPTIONS: Record<ToolName, string> = {
  find_procedure:
    'Busca en los mapas de sedes los trámites que encajan con lo que pide la persona. Úsalo antes de moverte, para saber a qué página ir.',
  get_procedure:
    'Devuelve un trámite completo de un mapa: página de entrada, formas de identificarse, pasos, lo que hace la persona en cada paso y lo que conviene tener a mano.',
  read_page:
    'Lee la página que la persona tiene abierta (solo sedes oficiales). Devuelve el texto, y cada control con su referencia y su clase: {nav} lo puedes pulsar; {campo…} y {acción…} solo los toca la persona; {fuera…} no lo sigas. Los valores de los campos nunca aparecen.',
  open_page:
    'Abre una dirección https en la pestaña de la persona. Las sedes con mapa, las webs *.gob.es y las de comunidades autónomas se abren directamente. Cualquier otra web (por ejemplo, un ayuntamiento que encontraste con web_search) solo se abre si la persona la aprueba: explica en reason por qué es la oficial.',
  click:
    'Pulsa un control de clase {nav} (enlace oficial, pestaña, menú, desplegable fuera de formularios) para moverte por la sede. Rechaza campos, botones de acción, cualquier cosa dentro de un formulario y enlaces externos.',
  point_to:
    'Resalta en la página un control que solo puede tocar la persona (un campo, un botón de acción) con una instrucción corta. Después termina tu turno: la persona pulsará «Hecho, sigue» cuando lo haya hecho.',
  show_form:
    'Muestra en el panel el formulario que el mapa de la sede define para un paso (get_procedure lo indica como «Formulario del panel»). La persona escribe ahí sus datos y la extensión los copia a los campos de la página. Tú no ves ni recibes esos datos: el resultado solo dice qué campos quedaron rellenados. Úsalo en vez de señalar esos campos uno a uno. No pulsa ningún botón: enviar sigue siendo cosa de la persona.',
  ask_user: 'Hace una pregunta a la persona con respuestas rápidas. Úsalo para decisiones (qué trámite, qué forma de identificarse), nunca para pedir datos personales.',
}

function jsonSchema(schema: z.ZodType): BetaTool['input_schema'] {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>
  return { ...rest, type: 'object' } as BetaTool['input_schema']
}

/** The tool definitions sent to the model. Built once, in a fixed order, so the prompt cache holds. */
export const TOOL_DEFS: BetaTool[] = (Object.keys(TOOL_INPUTS) as ToolName[]).map((name) => ({
  name,
  description: DESCRIPTIONS[name],
  input_schema: jsonSchema(TOOL_INPUTS[name]),
  eager_input_streaming: true,
}))

function frameOf(refText: string): number {
  const match = /^f(\d+):/.exec(refText)
  return match ? Number(match[1]) : 0
}

const error = (content: string): ToolOutcome => ({ content, isError: true })
const ok = (content: string, extra: Partial<ToolOutcome> = {}): ToolOutcome => ({ content, isError: false, ...extra })

const NOT_OFFICIAL =
  'La pestaña abierta no es una web oficial de confianza para la extensión, así que no puedo leerla ni tocarla. Busca la web oficial (find_procedure o web_search) y ábrela con open_page, o explícale a la persona qué hacer.'

async function officialTab(host: ToolHost): Promise<Tab | ToolOutcome> {
  const tab = await host.browser.activeTab()
  if (!tab) return error('No hay ninguna pestaña activa que pueda ver.')
  if (!isOfficialUrl(tab.url, trustedHosts(host.approvedHosts()))) return error(NOT_OFFICIAL)
  return tab
}

function describeProcedure(plugin: SitePlugin, procedureId: string): string | null {
  const proc = plugin.procedures.find((p) => p.id === procedureId)
  if (!proc) return null
  const lines = [
    `# ${proc.title} — ${plugin.name}`,
    `Mapa: ${plugin.status === 'verified' ? 'verificado' : 'BORRADOR (nadie lo ha recorrido con sesión iniciada; fíate de la página si no coincide)'}; revisado ${plugin.checked}.`,
    proc.summary,
    `Página de entrada: ${proc.entry_url}`,
    `Formas de identificarse: ${proc.login.join(', ')}`,
  ]
  if (proc.you_need?.length) lines.push(`Conviene tener a mano: ${proc.you_need.join('; ')}`)
  lines.push('', 'Pasos:')
  proc.steps.forEach((step, i) => {
    lines.push(`${i + 1}. ${step.title}${step.url ? ` (${step.url})` : ''}`)
    lines.push(`   Cómo: ${step.guidance}`)
    if (step.person_does) lines.push(`   Lo hace la persona: ${step.person_does}`)
    if (step.user_only?.length) lines.push(`   Solo los pulsa la persona: ${step.user_only.join(', ')}`)
    if (step.form) lines.push(`   Formulario del panel: ${step.form.id} (ábrelo con show_form; rellena ${step.form.fields.map((f) => f.label).join(', ')})`)
  })
  const notes = [...(plugin.notes ?? []), ...(proc.notes ?? [])]
  if (notes.length) lines.push('', 'Notas:', ...notes.map((n) => `- ${n}`))
  return lines.join('\n')
}

const OUTLINE_BUDGET = 60_000

async function readPage(host: ToolHost, state: ToolState, query: string | undefined): Promise<ToolOutcome> {
  const tab = await officialTab(host)
  if ('isError' in tab) return tab
  const frames = await host.browser.frames(tab.id).catch(() => [0])
  state.reset(tab.url)
  const parts: string[] = []
  let elements = 0
  let busy = false
  for (const frameId of frames.length ? frames : [0]) {
    const result = await host.browser
      .page<(Outline & { url: string; title: string }) | { error: string }>(tab.id, { op: 'outline', query, ref_prefix: frameId ? `f${frameId}:` : '', approved: host.approvedHosts() }, frameId)
      .catch((e: unknown) => ({ error: e instanceof Error ? e.message : String(e) }))
    if ('error' in result) {
      if (frameId === 0) return error(result.error)
      continue
    }
    for (const [key, cls] of Object.entries(result.classes)) state.classes.set(key, cls)
    elements += result.elements
    busy ||= result.busy
    if (result.outline) parts.push(frameId ? `--- marco f${frameId} (${result.url}) ---\n${result.outline}` : result.outline)
  }
  const plugin = pluginForUrl(tab.url, host.plugins ?? PLUGINS)
  const trust = trustOf(tab.url, host.approvedHosts())
  const header = [
    `URL: ${tab.url}`,
    `Título: ${tab.title}`,
    plugin
      ? `Sede: ${plugin.name} (mapa ${plugin.status === 'verified' ? 'verificado' : 'en borrador'})`
      : trust === 'government'
        ? 'Web de la Administración sin mapa: guíate por lo que muestra la página.'
        : 'Web aprobada por la persona en esta sesión, sin mapa: guíate por lo que muestra la página.',
    busy ? 'La página parece estar cargando todavía: vuelve a leerla en un momento si falta algo.' : null,
    query && !parts.length ? `Nada coincide con "${query}". Lee la página sin filtro.` : null,
    `${elements} controles.`,
  ].filter(Boolean)
  let body = parts.join('\n\n')
  if (body.length > OUTLINE_BUDGET) body = `${body.slice(0, OUTLINE_BUDGET)}\n… (página recortada: usa query para buscar una parte concreta)`
  return ok(`${header.join('\n')}\n\n${body}`)
}

/** Runs one tool call. `input` is whatever the model sent; it is validated before anything happens. */
export async function runTool(name: string, input: unknown, host: ToolHost, state: ToolState): Promise<ToolOutcome> {
  if (!(name in TOOL_INPUTS)) return error(`No existe la herramienta ${name}.`)
  const parsed = TOOL_INPUTS[name as ToolName].safeParse(input)
  if (!parsed.success) {
    return error(JSON.stringify({ INVALID_JSON: JSON.stringify(input ?? null).slice(0, 2000), problemas: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) }))
  }
  const plugins = host.plugins ?? PLUGINS
  const wait = host.wait ?? ((ms: number) => new Promise<void>((done) => setTimeout(done, ms)))
  switch (name as ToolName) {
    case 'find_procedure': {
      const { query } = parsed.data as z.infer<typeof TOOL_INPUTS.find_procedure>
      const hits = searchProcedures(query, plugins)
      if (!hits.length) {
        return ok(`Ningún mapa tiene un trámite que encaje con "${query}". Busca la web oficial con web_search (prefiere dominios .gob.es, de comunidades autónomas o de ayuntamientos) y ábrela con open_page.`)
      }
      return ok(
        hits
          .map(({ plugin, procedure }) => `- ${plugin.id} / ${procedure.id}: ${procedure.title} (${plugin.name}; mapa ${plugin.status === 'verified' ? 'verificado' : 'en borrador'}). ${procedure.summary} Entrada: ${procedure.entry_url}`)
          .join('\n'),
      )
    }
    case 'get_procedure': {
      const { plugin_id, procedure_id } = parsed.data as z.infer<typeof TOOL_INPUTS.get_procedure>
      const plugin = pluginById(plugin_id, plugins)
      if (!plugin) return error(`No hay ningún mapa ${plugin_id}. Usa find_procedure.`)
      const text = describeProcedure(plugin, procedure_id)
      return text ? ok(text) : error(`El mapa ${plugin_id} no tiene el trámite ${procedure_id}. Trámites: ${plugin.procedures.map((p) => p.id).join(', ')}`)
    }
    case 'read_page': {
      const { query } = parsed.data as z.infer<typeof TOOL_INPUTS.read_page>
      return readPage(host, state, query)
    }
    case 'open_page': {
      const { url, reason } = parsed.data as z.infer<typeof TOOL_INPUTS.open_page>
      const target = hostOf(url)
      if (!target || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(target)) return error('Solo puedo abrir direcciones https normales (sin usuario ni contraseña en la dirección).')
      if (!isOfficialUrl(url, trustedHosts(host.approvedHosts()))) {
        const approved = await host.approveSite(url, reason)
        if (!approved) return error(`La persona no ha aprobado ${target}. No la abras; pregúntale cómo quiere seguir o busca otra web oficial.`)
      }
      const tab = await host.browser.activeTab()
      if (!tab) return error('No hay ninguna pestaña activa.')
      const opened = await host.browser.navigate(tab.id, url)
      state.reset(opened.url)
      return ok(`Abierta: ${opened.url} — ${opened.title}. Lee la página para ver qué hay.`)
    }
    case 'click': {
      const input = parsed.data as z.infer<typeof TOOL_INPUTS.click>
      // First check, in the panel: what the last read said this control is.
      const cls = state.classes.get(input.ref)
      if (!cls) return error(`No conozco el elemento ${input.ref}. Lee la página (read_page) y usa una referencia de esa lectura.`)
      if (cls !== 'nav') return { ...error(REFUSAL[cls]), content: `${REFUSAL[cls]} (${input.ref} es ${cls})` }
      const tab = await officialTab(host)
      if ('isError' in tab) return tab
      // Second check, in the page, on the live element.
      const result = await host.browser.page<ClickResult | { error: string }>(tab.id, { op: 'click', ref: input.ref, approved: host.approvedHosts() }, frameOf(input.ref))
      if ('error' in result && !('ok' in result)) return error(result.error)
      if (!('ok' in result) || !result.ok) return error(('error' in result && result.error) || 'No se pudo pulsar.')
      await wait(900)
      const after = await host.browser.activeTab()
      if (after && after.url !== state.url) state.reset(after.url)
      return ok(`Pulsado «${result.name}». Ahora estás en ${after?.url ?? 'la misma página'}. Lee la página antes de seguir.`)
    }
    case 'point_to': {
      const input = parsed.data as z.infer<typeof TOOL_INPUTS.point_to>
      if (!state.classes.has(input.ref)) return error(`No conozco el elemento ${input.ref}. Lee la página (read_page) primero.`)
      const tab = await officialTab(host)
      if ('isError' in tab) return tab
      const result = await host.browser.page<{ ok: boolean; error?: string }>(tab.id, { op: 'point', ref: input.ref, instruction: input.instruction, approved: host.approvedHosts() }, frameOf(input.ref))
      if (!result.ok) return error(result.error ?? 'No se pudo señalar.')
      return ok('Señalado en la página. Termina tu turno con una frase corta que repita la instrucción; la persona pulsará «Hecho, sigue» cuando lo haya hecho.', { pointed: true })
    }
    case 'show_form': {
      const { form_id } = parsed.data as z.infer<typeof TOOL_INPUTS.show_form>
      const tab = await officialTab(host)
      if ('isError' in tab) return tab
      const forms = formsOf(pluginForUrl(tab.url, plugins))
      const form = forms.find((f) => f.id === form_id)
      if (!form) {
        return error(forms.length ? `Esta sede no tiene el formulario ${form_id}. Formularios de esta sede: ${forms.map((f) => f.id).join(', ')}.` : 'La sede abierta no tiene formularios del panel. Señala los campos con point_to.')
      }
      if (!host.showForm) return error('El panel no puede mostrar formularios. Señala los campos con point_to.')
      const present = await probePageForm(host.browser, tab.id, form.id, host.approvedHosts())
      if (!present.length) return error('Los campos de ese formulario no están en la página abierta. Lee la página y lleva a la persona a la pantalla del formulario antes de abrirlo.')
      const outcome = await host.showForm({ tabId: tab.id, form, present })
      if (outcome.status === 'declined') return ok('La persona no ha usado el formulario del panel. Señala los campos uno a uno con point_to para que los escriba en la web.')
      const labels = (ids: string[]) => form.fields.filter((f) => ids.includes(f.id)).map((f) => f.label).join(', ')
      const empty = present.filter((id) => !outcome.filled.includes(id) && !outcome.failed.includes(id))
      return ok(
        [
          `La persona ha escrito sus datos en el formulario del panel y la extensión los ha copiado a la página. Rellenados: ${labels(outcome.filled) || 'ninguno'}.`,
          outcome.failed.length ? `No se pudieron copiar: ${labels(outcome.failed)}. Señálaselos con point_to para que los escriba en la web.` : null,
          empty.length ? `Dejó en blanco: ${labels(empty)}.` : null,
          'No has visto los valores: no los pidas ni los repitas. Lee la página y sigue con el paso siguiente.',
        ]
          .filter(Boolean)
          .join(' '),
      )
    }
    case 'ask_user': {
      const input = parsed.data as z.infer<typeof TOOL_INPUTS.ask_user>
      const answer = await host.ask(input.question, input.options)
      return ok(`La persona responde: ${answer}`)
    }
  }
}
