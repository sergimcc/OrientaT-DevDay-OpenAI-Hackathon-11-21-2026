import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { build } from 'esbuild'
import { JSDOM, VirtualConsole } from 'jsdom'

let bundle: string
const panels: JSDOM[] = []
beforeAll(async () => {
  const result = await build({ entryPoints: ['src/ui/main.tsx'], bundle: true, write: false, format: 'iife', target: 'chrome120', define: { 'process.env.NODE_ENV': '"production"' } })
  bundle = result.outputFiles![0]!.text
})
afterEach(() => { for (const panel of panels.splice(0)) panel.window.close() })

function openPanel({ provider = 'openai', v = 2, failStorage = false, failRender = false, fetchImpl = fetch } = {}) {
  const panel = new JSDOM('<div id="root"></div>', { url: 'https://extension.test/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: new VirtualConsole() })
  panels.push(panel)
  const event = { addListener() {}, removeListener() {} }
  const executeScript = vi.fn(async (_details: { args?: unknown[]; target?: { frameIds?: number[] } }) => [{ frameId: 0, result: { ok: true } }])
  const get = vi.fn(async () => {
    if (failStorage) throw new Error('Extension context invalidated.')
    return { settings: { provider, v } }
  })
  Object.assign(panel.window, {
    TextEncoder, TextDecoder, fetch: fetchImpl,
    chrome: {
      sidePanel: {},
      storage: { local: { get }, session: { get: async () => ({}) }, onChanged: event },
      scripting: { executeScript },
      tabs: { query: async () => [{ id: 7, url: 'https://www.citapreviadnie.es/citaPreviaDni/', title: 'Cita previa' }], onUpdated: event, onActivated: failRender ? { addListener() { throw new Error('Panel lifecycle failed') } } : event },
      windows: { getCurrent: async () => ({ id: 1 }), onFocusChanged: event },
    },
  })
  // Like current Chrome: scrollIntoView returns a Promise (jsdom's returns nothing).
  panel.window.HTMLElement.prototype.scrollIntoView = (() => Promise.resolve()) as unknown as HTMLElement['scrollIntoView']
  panel.window.eval(bundle)
  return { document: panel.window.document, get, executeScript }
}

describe('built extension panel', () => {
  it('opens the redesigned chat with its logo and send control', async () => {
    const { document } = openPanel()
    await vi.waitFor(() => expect(document.querySelector('textarea')).not.toBeNull())
    expect(document.querySelector('.brand-lockup svg path')).not.toBeNull()
    expect(document.querySelector('button[aria-label="Enviar"]')).not.toBeNull()
  })

  it('keeps the chat open after a starter is clicked', async () => {
    const { document } = openPanel()
    await vi.waitFor(() => expect(document.querySelector('.starters button')).not.toBeNull())
    document.querySelector<HTMLButtonElement>('.starters button')!.click()
    await vi.waitFor(() => expect(document.querySelector('.msg.user')?.textContent).toBe('Quiero renovar el DNI'))
    expect(document.querySelector('[role="alert"]')).toBeNull()
    expect(document.querySelector('textarea')).not.toBeNull()
  })

  it('frames the page while the assistant works and removes the frame when it stops', async () => {
    // The model never answers, so the turn keeps running until the person stops it.
    const hang = (_url: unknown, init?: RequestInit) => new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))
    const { document, executeScript } = openPanel({ fetchImpl: hang as typeof fetch })
    const frameCalls = () => executeScript.mock.calls.map(([details]) => details.args?.[0] as { op?: string; on?: boolean; label?: string } | undefined).filter((request) => request?.op === 'frame')
    await vi.waitFor(() => expect(document.querySelector('.starters button')).not.toBeNull())
    document.querySelector<HTMLButtonElement>('.starters button')!.click()
    await vi.waitFor(() => expect(frameCalls().at(-1)).toMatchObject({ on: true, label: 'El asistente está leyendo esta página' }))
    document.querySelector<HTMLButtonElement>('button[aria-label="Detener"]')!.click()
    await vi.waitFor(() => expect(frameCalls().at(-1)).toMatchObject({ on: false }))
  })

  it('«Nueva» starts a new conversation even while a page action is still running', async () => {
    let calls = 0
    const reply = async () => Response.json(calls++ === 0
      ? { content: [{ type: 'tool_use', id: 't1', name: 'read_page', input: {} }], stop_reason: 'tool_use' }
      : { content: [{ type: 'text', text: 'Nueva respuesta' }], stop_reason: 'end_turn' })
    const { document, executeScript } = openPanel({ fetchImpl: reply as typeof fetch })
    // Reading the page never finishes (a page that hangs); the frame still answers.
    executeScript.mockImplementation((details) => ((details.args?.[0] as { op?: string } | undefined)?.op === 'frame' ? Promise.resolve([{ frameId: 0, result: { ok: true } }]) : new Promise(() => {})))
    await vi.waitFor(() => expect(document.querySelector('.starters button')).not.toBeNull())
    document.querySelector<HTMLButtonElement>('.starters button')!.click()
    // Wait until the turn is inside read_page (its call names one frame), not the panel preparing the page.
    await vi.waitFor(() => expect(executeScript.mock.calls.some(([details]) => !details.args && (details as { target?: { frameIds?: number[] } }).target?.frameIds)).toBe(true))
    document.querySelector<HTMLButtonElement>('.new-chat')!.click()
    await vi.waitFor(() => expect(document.querySelector('button[aria-label="Detener"]')).toBeNull())
    document.querySelectorAll<HTMLButtonElement>('.starters button')[1]!.click()
    await vi.waitFor(() => expect([...document.querySelectorAll('.msg')].map((m) => m.textContent?.trim())).toEqual(['Pedir cita para el pasaporte', 'Nueva respuesta']))
  })

  it('moves settings saved before OpenAI became the default to OpenAI', async () => {
    const { document } = openPanel({ provider: 'anthropic', v: 1 })
    await vi.waitFor(() => expect(document.querySelector('textarea')).not.toBeNull())
    expect(document.querySelector('.onboarding')).toBeNull()
  })

  it('opens onboarding when Anthropic is chosen without an API key', async () => {
    const { document } = openPanel({ provider: 'anthropic' })
    await vi.waitFor(() => expect(document.querySelector('.onboarding input')).not.toBeNull())
    expect(document.querySelector('.brand-lockup')).not.toBeNull()
  })

  it('reports storage failure and retries without leaving a blank panel', async () => {
    const { document, get } = openPanel({ failStorage: true })
    await vi.waitFor(() => expect(document.querySelector('[role="alert"]')?.textContent).toContain('Extension context invalidated.'))
    get.mockResolvedValue({ settings: { provider: 'openai', v: 2 } })
    document.querySelector<HTMLButtonElement>('button')!.click()
    await vi.waitFor(() => expect(document.querySelector('textarea')).not.toBeNull())
    expect(document.querySelector('[role="alert"]')).toBeNull()
  })

  it('shows a recovery screen for a React lifecycle failure', async () => {
    const { document } = openPanel({ failRender: true })
    await vi.waitFor(() => expect(document.querySelector('[role="alert"]')?.textContent).toContain('Panel lifecycle failed'))
    expect(document.querySelector('button')?.textContent).toBe('Recargar panel')
  })
})
