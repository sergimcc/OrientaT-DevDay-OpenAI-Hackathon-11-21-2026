import Anthropic from '@anthropic-ai/sdk'
import type { BetaMessageParam } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { createClient, runTurn } from '../agent/agent'
import { fillPageForm } from '../agent/formFill'
import { createLocalClient } from '../agent/localClient'
import type { TurnResult } from '../agent/agent'
import { FRAME_RENEW_MS, activeTab, chromeBrowser, clearHighlight, preparePage, setWorkingFrame } from '../agent/chromeBrowser'
import { ToolState } from '../agent/tools'
import type { FormOutcome, Tab } from '../agent/tools'
import { trackUserWindow, windowMode } from '../agent/userWindow'
import { PENDING_TTL_MS, handoffMessage, pendingKey } from '../handoff'
import type { PendingTask } from '../handoff'
import { fieldProblem } from '../page/form'
import { halfMask } from '../page/mask'
import { pluginForUrl } from '../plugins/registry'
import type { FormField } from '../plugins/schema'
import { hostOf, trustOf } from '../trust'
import { Activity, LiveStatus } from './Activity'
import { BrandLockup, BrandMark } from './Brand'
import { IconCheck, IconClose, IconGlobe, IconSliders, IconSend, IconStop, IconLock, IconMic, IconPhoneOff } from './Icons'
import { labelFor, toRows } from './activityRows'
import { newId } from './conversation'
import type { Item } from './conversation'
import { BUILD, downloadLog, record, setTranscriptSource } from './debugLog'
import { renderMarkdown } from './markdown'
import { DEFAULTS, EFFORTS, MODELS, PROVIDERS, THEMES, loadApiKey, loadSettings, saveApiKey, saveSettings } from './settings'
import type { Settings } from './settings'
import { dropSiteAccess, loadApprovedHosts, requestSiteAccess, saveApprovedHosts } from './sites'
import { VOICE_MESSAGES, useVoiceSession } from './voice'
import { VoiceOrb } from './VoiceOrb'

const STARTERS: { label: string; hint: string }[] = [
  { label: 'Quiero renovar el DNI', hint: 'Cita previa · Policía Nacional' },
  { label: 'Pedir cita para el pasaporte', hint: 'Cita previa · Policía Nacional' },
  { label: '¿Qué tengo que llevar a la cita del DNI?', hint: 'Requisitos' },
  { label: 'Quiero pedir una vivienda de alquiler asequible', hint: 'Casa 47' },
  { label: 'Empadronarme en mi ayuntamiento', hint: 'El asistente busca la web oficial' },
]

const DONE_MESSAGE = 'Hecho, sigue.'
const FRAME_WORKING = 'El asistente está leyendo esta página'
const FRAME_WAITING = 'El asistente te espera en el panel'

function errorText(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'La clave de API no es válida. Revísala en Ajustes.'
  if (err instanceof Anthropic.PermissionDeniedError) return 'Tu clave de API no tiene permiso para usar este modelo. Prueba otro modelo en Ajustes.'
  if (err instanceof Anthropic.RateLimitError) return 'Has llegado al límite de uso de tu clave. Espera un momento y vuelve a intentarlo.'
  if (err instanceof Anthropic.APIConnectionError) return 'No hay conexión con el servicio. Comprueba tu conexión a internet.'
  if (err instanceof Anthropic.APIError) return `El servicio devolvió un error (${err.status ?? 'sin código'}). Vuelve a intentarlo.`
  return err instanceof Error ? err.message : String(err)
}

function stopNotice(result: TurnResult): string | null {
  switch (result.stop) {
    case 'refusal':
      return 'El modelo no puede ayudar con esta petición. Prueba a explicarla de otra forma.'
    case 'max_tokens':
      return 'La respuesta era demasiado larga y se cortó. Pídele que siga.'
    case 'too_many_steps':
      return 'El asistente ha dado muchos pasos seguidos y se ha parado. Dile cómo quieres seguir.'
    default:
      return null
  }
}

function useActiveTab(): Tab | null {
  const [tab, setTab] = useState<Tab | null>(null)
  useEffect(() => {
    const refresh = () => void activeTab().then(setTab).catch(() => setTab(null))
    refresh()
    const onUpdated = (_id: number, info: chrome.tabs.OnUpdatedInfo) => {
      if (info.url !== undefined || info.status === 'complete') refresh()
    }
    chrome.tabs.onActivated.addListener(refresh)
    chrome.tabs.onUpdated.addListener(onUpdated)
    chrome.windows.onFocusChanged.addListener(refresh)
    return () => {
      chrome.tabs.onActivated.removeListener(refresh)
      chrome.tabs.onUpdated.removeListener(onUpdated)
      chrome.windows.onFocusChanged.removeListener(refresh)
    }
  }, [])
  return tab
}

const TRUST_CHIP = {
  government: { label: 'Administración', title: 'Web de la Administración pública (*.gob.es o una comunidad autónoma)' },
  approved: { label: 'Aprobada por ti', title: 'La aprobaste en esta sesión después de que el asistente la encontrara' },
} as const

function SiteBar({ tab, approved }: { tab: Tab | null; approved: string[] }) {
  const plugin = pluginForUrl(tab?.url)
  const trust = trustOf(tab?.url, approved)
  const host = hostOf(tab?.url) ?? ''
  return (
    <div className={`site trust-${trust}`} aria-live="polite">
      <IconGlobe size={15} />
      {trust === 'mapped' && plugin ? (
        <>
          <span className="host">{plugin.name}</span>
          <span className={`chip ${plugin.status}`} title={plugin.status === 'verified' ? 'Mapa comprobado por una persona' : 'Mapa en borrador: nadie lo ha recorrido entero todavía'}>
            {plugin.status === 'verified' ? 'Con mapa' : 'Mapa en borrador'}
          </span>
        </>
      ) : trust === 'government' || trust === 'approved' ? (
        <>
          <span className="host">{host}</span>
          <span className={`chip ${trust}`} title={TRUST_CHIP[trust].title}>
            {TRUST_CHIP[trust].label}
          </span>
        </>
      ) : (
        <span className="host muted">{tab ? `${host || 'Esta página'}: el asistente no puede leerla` : 'Sin pestaña'}</span>
      )}
    </div>
  )
}

function Onboarding({ onSave, onUseOpenAI }: { onSave: (key: string) => void; onUseOpenAI: () => void }) {
  const [key, setKey] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (key.trim()) onSave(key.trim())
  }
  return (
    <form className="onboarding" onSubmit={submit}>
      <div className="hero">
        <BrandMark size={44} className="hero-mark" />
        <h2>Te acompaño en tus trámites</h2>
        <p className="muted">
          Busco la web oficial, te llevo a la página correcta y te explico cada paso. Lo que hay que rellenar o pulsar para enviar, te lo señalo y lo haces tú.
        </p>
      </div>
      <ol className="promises">
        <li>
          <strong>Nunca escribo por ti.</strong> Tus datos los pones tú: en la web o, en algún paso, en un formulario de este panel que los copia tal cual sin que yo los vea.
        </li>
        <li>
          <strong>Nunca envío, firmo, pago ni confirmo.</strong> Esos botones los pulsas tú.
        </li>
        <li>
          <strong>Solo en webs oficiales.</strong> Si encuentro una que no conozco, te pido permiso antes de abrirla.
        </li>
      </ol>
      <label className="stack">
        <span>Tu clave de API de Anthropic</span>
        <input type="password" autoComplete="off" spellCheck={false} placeholder="sk-ant-…" value={key} onChange={(e) => setKey(e.target.value)} />
      </label>
      <button className="primary wide" type="submit" disabled={!key.trim()}>
        Guardar y empezar
      </button>
      <button className="wide" type="button" onClick={onUseOpenAI}>
        Usar OpenAI con el servidor local
      </button>
      <p className="small muted">
        Sin clave en el navegador: la clave de OpenAI está en web/.env.local y el servidor se arranca con npm run dev en la carpeta web.
      </p>
      <p className="privacy small muted">
        <strong>Privacidad.</strong> La clave se guarda solo en este navegador. El asistente envía al modelo el texto de las páginas oficiales que lee, nunca lo que escribes
        en los formularios: solo sabe si un campo está «rellenado» o «vacío». Los DNI, NIE, IBAN, números de la Seguridad Social, correos y móviles de la página se ocultan
        antes de enviarla. Lo que escribes en un formulario del panel va directo a la web oficial: no se envía al modelo ni se guarda. Para buscar webs oficiales usa la búsqueda web de Claude con las palabras del trámite, nunca con tus datos.
      </p>
    </form>
  )
}

function AskCard({ item, onAnswer }: { item: Extract<Item, { kind: 'ask' }>; onAnswer: (answer: string) => void }) {
  const [other, setOther] = useState('')
  if (item.answer !== undefined) {
    return (
      <div className="card ask answered">
        <p className="question">{item.question}</p>
        <p className="outcome approved">
          <IconCheck size={14} /> {item.answer}
        </p>
      </div>
    )
  }
  return (
    <div className="card ask">
      <p className="question">{item.question}</p>
      <div className="options">
        {item.options.map((option) => (
          <button key={option} type="button" onClick={() => onAnswer(option)}>
            {option}
          </button>
        ))}
      </div>
      <form
        className="other"
        onSubmit={(event) => {
          event.preventDefault()
          if (other.trim()) onAnswer(other.trim())
        }}
      >
        <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Otra respuesta" aria-label="Otra respuesta" />
        <button type="submit" disabled={!other.trim()}>
          Responder
        </button>
      </form>
    </div>
  )
}

function SiteCard({ item, onAnswer }: { item: Extract<Item, { kind: 'site' }>; onAnswer: (approve: boolean) => void }) {
  if (item.answer) {
    const text = { approved: `Aprobada: ${item.host}`, declined: `No aprobada: ${item.host}`, denied: `El navegador no dio acceso a ${item.host}` }[item.answer]
    return (
      <div className={`card site-card answered ${item.answer}`}>
        <p className="outcome">
          {item.answer === 'approved' ? <IconCheck size={14} /> : <IconClose size={14} />} {text}
        </p>
      </div>
    )
  }
  return (
    <div className="card site-card" role="alertdialog" aria-label="Aprobar una web">
      <span className="tag">Web nueva</span>
      <p className="question">El asistente quiere abrir una web que no tiene en su lista:</p>
      <p className="site-host">{item.host}</p>
      <p className="small">{item.reason}</p>
      <p className="small muted">
        Ábrela solo si es la web oficial de la Administración que buscas (un ayuntamiento, una diputación, un organismo público). Si dudas, di que no. El navegador te pedirá
        permiso para esa web.
      </p>
      <footer>
        <button type="button" className="primary" onClick={() => onAnswer(true)}>
          Es la oficial, ábrela
        </button>
        <button type="button" onClick={() => onAnswer(false)}>
          No
        </button>
      </footer>
    </div>
  )
}

/** Fields in rows: a one- or two-character field (the DNI letter) shares the row of the field before it. */
function fieldRows(fields: FormField[]): FormField[][] {
  const rows: FormField[][] = []
  for (const field of fields) {
    const last = rows[rows.length - 1]
    if (field.max_length <= 2 && last?.length === 1) last.push(field)
    else rows.push([field])
  }
  return rows
}

/**
 * A panel form. What the person types shows half covered, «1234****», as it does on the page
 * (src/page/mask.ts): the input keeps the real text, made transparent, under a covered copy.
 * What the person types lives only in this component until «Copiar a la web», then goes to
 * the page through `onSubmit`. It is never put in the conversation, so the assistant and the debug log
 * only ever learn which fields were filled.
 */
function FormCard({
  item,
  onSubmit,
  onDecline,
}: {
  item: Extract<Item, { kind: 'form' }>
  onSubmit: (values: Record<string, string>) => Promise<string | null>
  onDecline: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const fields = item.form.fields.filter((field) => item.present.includes(field.id))
  const labels = (ids: string[]) => fields.filter((field) => ids.includes(field.id)).map((field) => field.label).join(', ')

  if (item.outcome) {
    const { outcome } = item
    return (
      <div className="card form-card answered">
        {outcome.status === 'filled' ? (
          <>
            <p className="outcome approved">
              <IconCheck size={14} /> Copiado a la web: {labels(outcome.filled)}
            </p>
            {outcome.failed.length > 0 && (
              <p className="outcome">
                <IconClose size={14} /> Sin copiar: {labels(outcome.failed)}
              </p>
            )}
          </>
        ) : (
          <p className="outcome">
            <IconClose size={14} /> Formulario sin usar
          </p>
        )}
      </div>
    )
  }

  const problems = Object.fromEntries(fields.map((field) => [field.id, fieldProblem(field, values[field.id] ?? '')]))
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setChecked(true)
    setFailure(null)
    if (fields.some((field) => problems[field.id])) return
    setBusy(true)
    const error = await onSubmit(values)
    setBusy(false)
    if (error) setFailure(error)
    else setValues({})
  }

  return (
    <form className="card form-card" onSubmit={(event) => void submit(event)} noValidate autoComplete="off">
      <span className="tag">Tus datos</span>
      <p className="question">{item.form.title}</p>
      {item.form.intro && <p className="small muted">{item.form.intro}</p>}
      {fieldRows(fields).map((row) => (
        <div key={row[0]!.id} className="form-row">
          {row.map((field) => {
            const problem = checked ? problems[field.id] : null
            return (
              <label key={field.id} className={`form-field${field.max_length <= 2 ? ' tiny' : ''}`}>
                <span>
                  {field.label}
                  {field.optional && <em> (opcional)</em>}
                </span>
                <span className="masked-input">
                <input
                  type="text"
                  value={values[field.id] ?? ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  maxLength={field.max_length}
                  placeholder={field.placeholder}
                  inputMode={field.numeric ? 'numeric' : 'text'}
                  autoCapitalize={field.uppercase ? 'characters' : 'off'}
                  className={field.uppercase ? 'upper' : undefined}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={!!problem}
                  disabled={busy}
                />
                <span className={`cover${field.uppercase ? ' upper' : ''}`} aria-hidden="true">{halfMask(values[field.id] ?? '')}</span>
                </span>
                {problem ? <span className="field-problem">{problem}</span> : field.hint && field.max_length > 2 && <span className="small muted">{field.hint}</span>}
              </label>
            )
          })}
        </div>
      ))}
      {failure && (
        <p className="error" role="alert">
          {failure}
        </p>
      )}
      <p className="form-privacy small muted">
        <IconLock /> El asistente no ve estos datos. Van directos a la web oficial y no se guardan.
      </p>
      <footer>
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Copiando…' : 'Copiar a la web'}
        </button>
        <button type="button" className="ghost" disabled={busy} onClick={onDecline}>
          Prefiero escribirlos en la web
        </button>
      </footer>
    </form>
  )
}

function Sources({ item }: { item: Extract<Item, { kind: 'sources' }> }) {
  return (
    <details className="sources">
      <summary>
        {item.sources.length === 1 ? '1 resultado de búsqueda' : `${item.sources.length} resultados de búsqueda`}
      </summary>
      <ul>
        {item.sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              {source.title || source.url}
            </a>
            <span className="small muted"> {hostOf(source.url) ?? ''}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}

export function App() {
  const [ready, setReady] = useState(false)
  const [startupError, setStartupError] = useState<string | null>(null)
  const [startupAttempt, setStartupAttempt] = useState(0)
  const [apiKey, setApiKey] = useState('')
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [showSettings, setShowSettings] = useState(false)
  const [items, setItems] = useState<Item[]>([])
  const [draft, setDraft] = useState('')
  const [running, setRunning] = useState(false)
  const [awaitingDone, setAwaitingDone] = useState(false)
  const [approved, setApproved] = useState<string[]>([])
  const approvedRef = useRef<string[]>([])
  const history = useRef<BetaMessageParam[]>([])
  const toolState = useRef(new ToolState())
  const abort = useRef<AbortController | null>(null)
  // Bumped by «Nueva»: a turn from an earlier conversation may still be finishing a page action, and
  // whatever it reports afterwards must not reach the new conversation or keep the panel busy.
  const generation = useRef(0)
  const answers = useRef(new Map<string, (answer: string) => void>())
  const siteAnswers = useRef(new Map<string, (approved: boolean) => void>())
  const formAnswers = useRef(new Map<string, (outcome: FormOutcome) => void>())
  const logEnd = useRef<HTMLDivElement | null>(null)
  const tab = useActiveTab()
  // OpenAI goes through the local server, which holds its own key: no key is needed in the panel.
  const usable = settings.provider === 'openai' || !!apiKey

  const setApprovedHosts = useCallback((hosts: string[]) => {
    approvedRef.current = hosts
    setApproved(hosts)
    void saveApprovedHosts(hosts)
  }, [])

  useEffect(() => {
    let cancelled = false
    setStartupError(null)
    void (async () => {
      try {
        if (windowMode()) trackUserWindow()
        const [loaded, key, hosts] = await Promise.all([loadSettings(), loadApiKey(), loadApprovedHosts()])
        if (cancelled) return
        setSettings(loaded)
        setApiKey(key)
        approvedRef.current = hosts
        setApproved(hosts)
        setReady(true)
      } catch (error) {
        if (!cancelled) setStartupError(error instanceof Error ? error.message : String(error))
      }
    })()
    return () => { cancelled = true }
  }, [startupAttempt])

  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', settings.theme)
  }, [settings.theme])

  // Block bodies: an effect must return a cleanup function or nothing. Chrome's scrollIntoView returns a
  // Promise, which React would later try to call as the cleanup ("u is not a function").
  useEffect(() => {
    setTranscriptSource(() => items)
  }, [items])
  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: 'end' })
  }, [items, running])

  const update = useCallback((next: Settings) => {
    setSettings(next)
    void saveSettings(next)
  }, [])

  const push = (item: Item) => setItems((prev) => [...prev, item])
  const patch = (id: string, change: Partial<Item>) => setItems((prev) => prev.map((item) => (item.id === id ? ({ ...item, ...change } as Item) : item)))

  const send = useCallback(
    async (text: string) => {
      const message = text.trim()
      if (!message || running || !usable) return
      if (message === DONE_MESSAGE) await clearHighlight()
      setDraft('')
      setAwaitingDone(false)
      push({ kind: 'user', id: newId('user'), text: message })
      history.current.push({ role: 'user', content: message })
      const controller = new AbortController()
      abort.current = controller
      setRunning(true)
      const gen = generation.current
      const live = () => generation.current === gen
      const runId = newId('run')
      const assistantIds = new Map<number, string>()
      try {
        const result = await runTurn({
          client: settings.provider === 'openai' ? createLocalClient() : createClient(apiKey),
          model: settings.model,
          effort: settings.effort,
          history: history.current,
          state: toolState.current,
          signal: controller.signal,
          host: {
            browser: chromeBrowser,
            approvedHosts: () => approvedRef.current,
            ask: (question, options) =>
              new Promise<string>((resolve) => {
                if (!live()) return resolve('(la persona ha empezado una conversación nueva)')
                const id = newId('ask')
                answers.current.set(id, resolve)
                push({ kind: 'ask', id, question, options })
                controller.signal.addEventListener('abort', () => resolve('(la persona ha detenido al asistente)'), { once: true })
              }),
            approveSite: (url, reason) =>
              new Promise<boolean>((resolve) => {
                const host = hostOf(url)
                if (!host || !live()) return resolve(false)
                const id = newId('site')
                siteAnswers.current.set(id, resolve)
                push({ kind: 'site', id, url, host, reason })
                controller.signal.addEventListener('abort', () => resolve(false), { once: true })
              }),
            showForm: (request) =>
              new Promise<FormOutcome>((resolve) => {
                if (!live()) return resolve({ status: 'declined' })
                const id = newId('form')
                formAnswers.current.set(id, resolve)
                push({ kind: 'form', id, ...request })
                controller.signal.addEventListener('abort', () => resolve({ status: 'declined' }), { once: true })
              }),
          },
          events: {
            text(delta, turn) {
              if (!live()) return
              const known = assistantIds.get(turn)
              if (known) {
                setItems((prev) => prev.map((item) => (item.id === known && item.kind === 'assistant' ? { ...item, text: item.text + delta } : item)))
              } else {
                const id = `${runId}-${turn}`
                assistantIds.set(turn, id)
                push({ kind: 'assistant', id, text: delta })
              }
            },
            toolStart(id, name, input) {
              if (!live()) return
              record('tool_start', { name, input })
              push({ kind: 'tool', id, name, label: labelFor(name, input), status: 'running' })
            },
            toolEnd(id, name, outcome) {
              if (!live()) return
              record('tool_end', { name, outcome })
              const label = name === 'web_search' && outcome.content ? labelFor(name, { query: outcome.content }) : undefined
              patch(id, { status: outcome.isError ? 'error' : 'done', ...(label ? { label } : {}) })
            },
            sources(found) {
              if (!live()) return
              const unique = [...new Map(found.map((s) => [s.url, s])).values()].slice(0, 8)
              push({ kind: 'sources', id: newId('sources'), sources: unique })
            },
          },
        })
        if (!live()) return
        const notice = stopNotice(result)
        if (notice) push({ kind: 'notice', id: newId('notice'), text: notice, tone: 'info' })
        setAwaitingDone(result.pointed && result.stop !== 'aborted')
      } catch (err) {
        if (!live()) return
        record('error', { message: errorText(err) })
        push({ kind: 'notice', id: newId('notice'), text: errorText(err), tone: 'error' })
      } finally {
        if (live()) {
          abort.current = null
          setRunning(false)
          setItems((prev) =>
            prev.map((item) => (item.kind === 'tool' && item.status === 'running' ? { ...item, status: 'error' } : item.kind === 'site' && !item.answer ? { ...item, answer: 'declined' } : item.kind === 'form' && !item.outcome ? { ...item, outcome: { status: 'declined' } } : item)),
          )
        }
      }
    },
    [apiKey, usable, running, settings.effort, settings.model, settings.provider],
  )

  const voice = useVoiceSession({
    busy: running && !items.some(item => item.kind === 'ask' && !item.answer),
    onText: text => {
      const question = [...items].reverse().find(item => item.kind === 'ask' && !item.answer)
      if (question) {
        patch(question.id, { answer: text })
        answers.current.get(question.id)?.(text)
        answers.current.delete(question.id)
        push({ kind: 'user', id: newId('user'), text })
        return
      }
      void send(text)
    },
    replies: items.flatMap(item => item.kind === 'assistant' ? [{ id: item.id, text: item.text }]
      : item.kind === 'ask' ? [{ id: item.id, text: item.question, ready: true }] : []),
    onGreeting: text => push({ kind: 'assistant', id: newId('voice-greeting'), text }),
  })

  // A task handed over from the website (src/handoff.ts): when the panel is on the tab the background
  // opened for it, start it as the first message. Checked again whenever session storage changes, for a
  // panel that was already open when the hand-off arrived.
  const tabId = tab?.id
  useEffect(() => {
    if (!ready || !usable || running || tabId === undefined) return
    const key = pendingKey(tabId)
    const check = async () => {
      const task = (await chrome.storage.session.get(key))[key] as PendingTask | undefined
      if (!task) return
      await chrome.storage.session.remove(key)
      void chrome.action.setBadgeText({ tabId, text: '' }).catch(() => undefined)
      if (Date.now() - task.at < PENDING_TTL_MS) void send(handoffMessage(task))
    }
    void check()
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'session' && changes[key]?.newValue) void check()
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [ready, usable, running, tabId, send])

  // Cover personal data on official pages from the moment they load (src/page/mask.ts).
  // `tab` is a new object after every page load (useActiveTab), so a reload of the same URL counts too;
  // injecting twice is harmless (content.ts sets itself up once per page).
  useEffect(() => {
    if (tab) void preparePage(tab.id)
  }, [tab])

  const answer = (id: string, value: string) => {
    patch(id, { answer: value })
    answers.current.get(id)?.(value)
    answers.current.delete(id)
  }

  // Runs in the click handler, so Chrome may show its permission prompt.
  const answerSite = async (item: Extract<Item, { kind: 'site' }>, approve: boolean) => {
    const resolve = siteAnswers.current.get(item.id)
    siteAnswers.current.delete(item.id)
    if (!approve) {
      patch(item.id, { answer: 'declined' })
      resolve?.(false)
      return
    }
    const granted = await requestSiteAccess(item.host)
    if (granted) setApprovedHosts([...approvedRef.current, item.host])
    patch(item.id, { answer: granted ? 'approved' : 'denied' })
    resolve?.(granted)
  }

  const finishForm = (id: string, outcome: FormOutcome) => {
    patch(id, { outcome })
    formAnswers.current.get(id)?.(outcome)
    formAnswers.current.delete(id)
  }

  // The only place the person's values are handled outside the form itself: straight to the page.
  const submitForm = async (item: Extract<Item, { kind: 'form' }>, values: Record<string, string>): Promise<string | null> => {
    const result = await fillPageForm(chromeBrowser, item.tabId, item.form.id, values, approvedRef.current).catch(() => null)
    if (!result?.filled.length) return 'No se han podido copiar los datos. Comprueba que la página del formulario sigue abierta en esa pestaña y vuelve a intentarlo.'
    finishForm(item.id, { status: 'filled', ...result })
    return null
  }

  const forgetSite = (host: string) => {
    setApprovedHosts(approvedRef.current.filter((h) => h !== host))
    void dropSiteAccess(host)
  }

  const clearChat = () => {
    voice.stop()
    // Stop the running turn and let go of it at once: the new conversation starts now, even if the old
    // turn is still waiting for a page to load. It gets fresh state, so the old turn cannot touch it.
    abort.current?.abort()
    abort.current = null
    generation.current += 1
    setRunning(false)
    answers.current.clear()
    siteAnswers.current.clear()
    formAnswers.current.clear()
    history.current = []
    toolState.current = new ToolState()
    setItems([])
    setAwaitingDone(false)
    void clearHighlight()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      if (!running && event.currentTarget.value.trim()) {
        event.currentTarget.form?.requestSubmit()
      }
    }
  }

  const rows = useMemo(() => toRows(items), [items])
  const last = rows[rows.length - 1]
  const waitingOnPerson = last?.kind === 'ask' || (last?.kind === 'site' && !last.answer) || (last?.kind === 'form' && !last.outcome)

  // While the assistant works, a coloured frame around the person's page says it is reading and moving
  // around there (src/page/frame.ts). Re-sent after each page load and renewed on a timer, because the
  // frame expires by itself in case the panel closes mid-turn. Removed as soon as the turn ends.
  const frameLabel = useRef(FRAME_WORKING)
  frameLabel.current = waitingOnPerson ? FRAME_WAITING : FRAME_WORKING
  useEffect(() => {
    if (!running || tabId === undefined) return
    const show = () => void setWorkingFrame(tabId, true, approvedRef.current, frameLabel.current)
    const onUpdated = (id: number, info: chrome.tabs.OnUpdatedInfo) => {
      if (id === tabId && info.status === 'complete') show()
    }
    show()
    const timer = setInterval(show, FRAME_RENEW_MS)
    chrome.tabs.onUpdated.addListener(onUpdated)
    return () => {
      clearInterval(timer)
      chrome.tabs.onUpdated.removeListener(onUpdated)
      void setWorkingFrame(tabId, false, [])
    }
  }, [running, tabId])

  // A new label right away when the assistant starts or stops waiting for the person.
  useEffect(() => {
    if (running && tabId !== undefined) void setWorkingFrame(tabId, true, approvedRef.current, frameLabel.current)
  }, [waitingOnPerson, running, tabId])

  if (!ready) return (
    <div className="app">
      <header className="top"><BrandLockup /></header>
      <main className="onboarding">
        {startupError ? (
          <>
            <h2>No se ha podido abrir el asistente</h2>
            <p className="muted">Vuelve a intentarlo. Si acabas de actualizar la extensión, cierra el panel y ábrelo de nuevo.</p>
            <p className="error" role="alert">{startupError}</p>
            <button type="button" className="primary" onClick={() => setStartupAttempt((value) => value + 1)}>Reintentar</button>
          </>
        ) : <p role="status">Abriendo el asistente…</p>}
      </main>
    </div>
  )

  if (!usable) {
    return (
      <div className="app">
        <header className="top">
          <BrandLockup />
        </header>
        <Onboarding
          onSave={(key) => {
            setApiKey(key)
            void saveApiKey(key)
          }}
          onUseOpenAI={() => update({ ...settings, provider: 'openai' })}
        />
      </div>
    )
  }

  return (
    <div className="app">
      <header className="top">
        <BrandLockup />
        <span className="spacer" />
        <button type="button" className="ghost new-chat" onClick={clearChat} title="Nueva conversación">Nueva</button>
        <button type="button" className="ghost icon" aria-label="Ajustes" aria-pressed={showSettings} onClick={() => setShowSettings((v) => !v)}>
          {showSettings ? <IconClose /> : <IconSliders />}
        </button>
      </header>

      {showSettings && (
        <section className="settings" aria-label="Ajustes">
          <label>
            Proveedor
            <select value={settings.provider} onChange={(e) => update({ ...settings, provider: e.target.value as Settings['provider'] })}>
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          {settings.provider === 'openai' && (
            <p className="small muted">El modelo de OpenAI se elige en web/.env.local (OPENAI_MODEL). Mantén arrancado npm run dev en la carpeta web.</p>
          )}
          <label>
            Modelo
            <select disabled={settings.provider === 'openai'} value={settings.model} onChange={(e) => update({ ...settings, model: e.target.value as Settings['model'] })}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}: {m.note}
                </option>
              ))}
            </select>
          </label>
          <label>
            Esfuerzo
            <select disabled={settings.provider === 'openai'} value={settings.effort} onChange={(e) => update({ ...settings, effort: e.target.value as Settings['effort'] })}>
              {EFFORTS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tema
            <select value={settings.theme} onChange={(e) => update({ ...settings, theme: e.target.value as Settings['theme'] })}>
              {THEMES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <div className="stack">
            <span>Webs aprobadas en esta sesión</span>
            {approved.length === 0 ? (
              <p className="small muted">Ninguna. Las webs con mapa, las *.gob.es y las de comunidades autónomas no necesitan aprobación.</p>
            ) : (
              <ul className="approved">
                {approved.map((host) => (
                  <li key={host}>
                    <span>{host}</span>
                    <button type="button" className="ghost" onClick={() => forgetSite(host)}>
                      Quitar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="row">
            <button type="button" onClick={clearChat}>
              Borrar conversación
            </button>
            <button
              type="button"
              onClick={() => {
                setApiKey('')
                void saveApiKey('')
                clearChat()
              }}
            >
              Cambiar clave
            </button>
          </div>
          <div className="row">
            <button type="button" className="ghost" onClick={() => downloadLog({ model: settings.model, effort: settings.effort, approved })}>
              Descargar registro de depuración
            </button>
          </div>
          <p className="small muted">
            El registro incluye la conversación y las páginas leídas (sin valores de campos). Compártelo solo para informar de un problema. Versión {BUILD}.
          </p>
        </section>
      )}

      <SiteBar tab={tab} approved={approved} />

      <main className="log" aria-live="polite">
        {rows.length === 0 && (
          <div className="empty">
            <BrandMark size={48} className="empty-mark" />
            <h3>¿Qué trámite quieres hacer?</h3>
            <p className="muted">Cuéntamelo con tus palabras. Si no conozco la web, la busco y te pido permiso antes de abrirla.</p>
            <div className="starters">
              {STARTERS.map((starter) => (
                <button key={starter.label} type="button" title={starter.hint} onClick={() => void send(starter.label)}>
                  <span>{starter.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {rows.map((row) => {
          switch (row.kind) {
            case 'user':
              return (
                <div key={row.id} className="msg user">
                  {row.text}
                </div>
              )
            case 'assistant':
              return <div key={row.id} className="msg assistant" dangerouslySetInnerHTML={{ __html: renderMarkdown(row.text) }} />
            case 'activity':
              return <Activity key={row.id} group={row} live={running && row === last} />
            case 'ask':
              return <AskCard key={row.id} item={row} onAnswer={(value) => answer(row.id, value)} />
            case 'site':
              return <SiteCard key={row.id} item={row} onAnswer={(approve) => void answerSite(row, approve)} />
            case 'form':
              return <FormCard key={row.id} item={row} onSubmit={(values) => submitForm(row, values)} onDecline={() => finishForm(row.id, { status: 'declined' })} />
            case 'sources':
              return <Sources key={row.id} item={row} />
            case 'notice':
              return (
                <p key={row.id} className={row.tone === 'error' ? 'error' : 'notice'}>
                  {row.text}
                </p>
              )
            default:
              return null
          }
        })}
        {running && last?.kind !== 'activity' && !waitingOnPerson && <LiveStatus label="Pensando" />}
        {awaitingDone && !running && (
          <div className="done-bar" role="status">
            <p>
              <strong>Te toca a ti.</strong> Hazlo en la página resaltada y vuelve aquí.
            </p>
            <button type="button" className="primary" onClick={() => void send(DONE_MESSAGE)}>
              Hecho, sigue
            </button>
          </div>
        )}
        <div ref={logEnd} />
      </main>

      {voice.status !== 'idle' ? (
        <div className="composer voice-call">
          <VoiceOrb size={52} state={voice.status === 'connecting' ? 'connecting' : 'live'} getLevels={voice.getLevels} />
          <div className="voice-call-text">
            <p role="status">{voice.status === 'connecting' ? 'Conectando la voz…' : 'Voz de IA conectada. Puedes hablar.'}</p>
            {voice.error && <p className="voice-error" role="alert">{VOICE_MESSAGES[voice.error]}</p>}
          </div>
          <button type="button" className="voice-hangup" aria-label="Finalizar conversación de voz" title="Finalizar conversación de voz" onClick={voice.stop}>
            <IconPhoneOff />
          </button>
        </div>
      ) : (
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault()
          void send(draft)
        }}
      >
        <textarea
          rows={2}
          value={draft}
          placeholder="Escribe tu pregunta…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Mensaje"
          enterKeyHint="send"
          title="Enter para enviar · Mayús+Enter para un salto de línea"
        />
        <div className="composer-footer">
          <span className="composer-privacy"><IconLock /> Nada se envía sin tu confirmación</span>
          <div className="composer-actions">
          <button type="button" className="voice-button" aria-label="Hablar con el asistente" title="Hablar con el asistente" onClick={() => void voice.start()}>
            <VoiceOrb size={32} state="idle" />
            <IconMic size={14} />
          </button>
          {running ? (
            <button type="button" className="primary send-button" aria-label="Detener" title="Detener" onClick={() => abort.current?.abort()}>
              <IconStop />
            </button>
          ) : (
            <button type="submit" className="primary send-button" aria-label="Enviar" title="Enviar (Enter)" disabled={!draft.trim()}>
              <IconSend />
            </button>
          )}
          </div>
        </div>
        {voice.error && <p className="voice-error" role="alert">{VOICE_MESSAGES[voice.error]}</p>}
      </form>
      )}
    </div>
  )
}
