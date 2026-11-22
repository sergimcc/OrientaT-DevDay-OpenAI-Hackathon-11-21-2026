import { describe, expect, it, vi } from 'vitest'
import { TOOL_DEFS, TOOL_INPUTS, ToolState, runTool } from '../src/agent/tools'
import type { Browser, Tab, ToolHost } from '../src/agent/tools'
import type { PageRequest } from '../src/page/messages'

const OFFICIAL: Tab = { id: 1, url: 'https://www.citapreviadnie.es/citaPreviaDni/', title: 'Cita previa DNI' }

function fakeHost(tab: Tab = OFFICIAL) {
  const requests: PageRequest[] = []
  const browser: Browser = {
    activeTab: vi.fn(async () => tab),
    frames: vi.fn(async () => [0]),
    page: vi.fn(async (_tabId: number, request: PageRequest) => {
      requests.push(request)
      if (request.op === 'outline') {
        return {
          url: tab.url,
          title: tab.title,
          outline: '[e1] link "Ayuda" {nav}\n[e2] textbox "DNI" (vacío) {campo}\n[e3] button "Confirmar" {acción}\n[e4] link "Gestoría" {fuera}',
          elements: 4,
          matched: true,
          busy: false,
          classes: { e1: 'nav', e2: 'field', e3: 'action', e4: 'external' },
        }
      }
      if (request.op === 'click') return { ok: true, name: 'Ayuda' }
      if (request.op === 'point') return { ok: true }
      if (request.op === 'form') return { present: ['numero', 'letra', 'equipo', 'validez', 'soporte'] }
      return { ok: true }
    }) as Browser['page'],
    navigate: vi.fn(async (_id: number, url: string) => ({ id: 1, url, title: 'Abierta' })),
  }
  const approved: string[] = []
  const host: ToolHost = {
    browser,
    ask: vi.fn(async () => 'Renovar'),
    approveSite: vi.fn(async () => false),
    approvedHosts: () => approved,
    wait: async () => {},
  }
  return { host, browser, requests, approved, state: new ToolState() }
}

describe('tool surface', () => {
  it('has no tool that types, fills, selects or submits', () => {
    const names = TOOL_DEFS.map((t) => t.name)
    expect(names).toEqual(['find_procedure', 'get_procedure', 'read_page', 'open_page', 'click', 'point_to', 'show_form', 'ask_user'])
    expect(names.join(' ')).not.toMatch(/fill|type|select|submit|press|act\b|write|input/)
    expect(JSON.stringify(TOOL_DEFS)).not.toMatch(/"value"/)
  })

  it('streams tool inputs eagerly and sends object schemas without extra properties', () => {
    for (const tool of TOOL_DEFS) {
      expect(tool.eager_input_streaming).toBe(true)
      expect(tool.input_schema.type).toBe('object')
      expect((tool.input_schema as { additionalProperties?: boolean }).additionalProperties).toBe(false)
    }
  })

  it('rejects inputs that do not match the schema before doing anything', async () => {
    const { host, browser, state } = fakeHost()
    const result = await runTool('click', { ref: 'e1' }, host, state)
    expect(result.isError).toBe(true)
    expect(result.content).toContain('INVALID_JSON')
    expect(browser.page).not.toHaveBeenCalled()
    expect((await runTool('fill', { ref: 'e2', value: 'x' }, host, state)).isError).toBe(true)
    expect(TOOL_INPUTS.click.safeParse({ ref: 'e1', reason: 'abrir', value: 'x' }).success).toBe(false)
  })
})

describe('click', () => {
  it('presses a nav control from the last read', async () => {
    const { host, state, requests } = fakeHost()
    await runTool('read_page', {}, host, state)
    const result = await runTool('click', { ref: 'e1', reason: 'Abrir la ayuda' }, host, state)
    expect(result.isError).toBe(false)
    expect(requests.filter((r) => r.op === 'click')).toEqual([{ op: 'click', ref: 'e1', approved: [] }])
  })

  it.each([
    ['e2', 'campo'],
    ['e3', 'botón'],
    ['e4', 'fuera de las webs de confianza'],
  ])('refuses %s in the panel and never asks the page to click', async (ref, words) => {
    const { host, state, requests } = fakeHost()
    await runTool('read_page', {}, host, state)
    const result = await runTool('click', { ref, reason: 'intento' }, host, state)
    expect(result.isError).toBe(true)
    expect(result.content.toLowerCase()).toContain(words.toLowerCase())
    expect(requests.some((r) => r.op === 'click')).toBe(false)
  })

  it('refuses a ref it has not read', async () => {
    const { host, state, requests } = fakeHost()
    const result = await runTool('click', { ref: 'e1', reason: 'abrir' }, host, state)
    expect(result.isError).toBe(true)
    expect(requests).toEqual([])
  })

  it('passes on the page refusal when the live element is no longer nav', async () => {
    const { host, state, browser } = fakeHost()
    await runTool('read_page', {}, host, state)
    vi.mocked(browser.page).mockResolvedValueOnce({ ok: false, refused: 'action', error: 'Es un botón que envía' })
    const result = await runTool('click', { ref: 'e1', reason: 'abrir' }, host, state)
    expect(result).toMatchObject({ isError: true, content: 'Es un botón que envía' })
  })
})

describe('pages off the trusted sites', () => {
  it('will not read, click or point on them', async () => {
    const { host, state, requests } = fakeHost({ id: 1, url: 'https://www.example.com/', title: 'Otra' })
    expect((await runTool('read_page', {}, host, state)).content).toContain('no es una web oficial de confianza')
    state.classes.set('e1', 'nav')
    expect((await runTool('click', { ref: 'e1', reason: 'abrir' }, host, state)).isError).toBe(true)
    expect((await runTool('point_to', { ref: 'e1', instruction: 'Pulsa aquí' }, host, state)).isError).toBe(true)
    expect(requests).toEqual([])
  })

  it('never opens non-https addresses or addresses with credentials, and does not even ask', async () => {
    const { host, state, browser } = fakeHost()
    for (const url of ['http://www.citapreviadnie.es/', 'javascript:alert(1)', 'https://user:pw@www.casa47.es/', 'file:///etc/passwd']) {
      expect((await runTool('open_page', { url, reason: 'prueba' }, host, state)).isError).toBe(true)
    }
    expect(host.approveSite).not.toHaveBeenCalled()
    expect(browser.navigate).not.toHaveBeenCalled()
  })

  it('opens mapped and public-administration sites without asking', async () => {
    const { host, state, browser } = fakeHost()
    for (const url of ['https://portal.casa47.es/', 'https://sede.agenciatributaria.gob.es/', 'https://web.gencat.cat/es/tramits']) {
      expect((await runTool('open_page', { url, reason: 'es la oficial' }, host, state)).isError).toBe(false)
    }
    expect(host.approveSite).not.toHaveBeenCalled()
    expect(browser.navigate).toHaveBeenCalledTimes(3)
  })

  it('asks the person before opening any other site, and does not open it if they decline', async () => {
    const { host, state, browser } = fakeHost()
    const result = await runTool('open_page', { url: 'https://sede.valencia.es/sede/', reason: 'Sede electrónica del Ayuntamiento de Valencia' }, host, state)
    expect(host.approveSite).toHaveBeenCalledWith('https://sede.valencia.es/sede/', 'Sede electrónica del Ayuntamiento de Valencia')
    expect(result.isError).toBe(true)
    expect(browser.navigate).not.toHaveBeenCalled()
    expect((await runTool('open_page', { url: 'https://citapreviadnie.es.evil.com/', reason: 'x' }, host, state)).isError).toBe(true)
  })

  it('opens an approved site, and then reads it like any trusted site', async () => {
    const { host, state, browser, approved } = fakeHost({ id: 1, url: 'https://sede.valencia.es/sede/', title: 'Sede' })
    vi.mocked(host.approveSite).mockImplementation(async (url) => {
      approved.push(new URL(url).hostname)
      return true
    })
    expect((await runTool('open_page', { url: 'https://sede.valencia.es/sede/', reason: 'Sede del ayuntamiento' }, host, state)).isError).toBe(false)
    expect(browser.navigate).toHaveBeenCalledOnce()
    const read = await runTool('read_page', {}, host, state)
    expect(read.isError).toBe(false)
    expect(read.content).toContain('aprobada por la persona')
  })
})

describe('point_to, ask_user and the site maps', () => {
  it('points at any control from the last read and says so', async () => {
    const { host, state, requests } = fakeHost()
    await runTool('read_page', {}, host, state)
    const result = await runTool('point_to', { ref: 'e2', instruction: 'Escribe aquí tu número de DNI' }, host, state)
    expect(result).toMatchObject({ isError: false, pointed: true })
    expect(requests.at(-1)).toEqual({ op: 'point', ref: 'e2', instruction: 'Escribe aquí tu número de DNI', approved: [] })
  })

  it('asks the person', async () => {
    const { host, state } = fakeHost()
    const result = await runTool('ask_user', { question: '¿Qué trámite?', options: ['Renovar', 'Primera vez'] }, host, state)
    expect(result.content).toContain('Renovar')
  })

  it('finds and describes procedures, flagging drafts', async () => {
    const { host, state } = fakeHost()
    expect((await runTool('find_procedure', { query: 'renovar dni' }, host, state)).content).toContain('cita-dni / pedir-cita')
    const detail = await runTool('get_procedure', { plugin_id: 'cita-dni', procedure_id: 'pedir-cita' }, host, state)
    expect(detail.content).toContain('BORRADOR')
    expect(detail.content).toContain('https://www.citapreviadnie.es/citaPreviaDni/')
    expect((await runTool('get_procedure', { plugin_id: 'cita-dni', procedure_id: 'nada' }, host, state)).isError).toBe(true)
  })
})

describe('show_form', () => {
  it('shows the map\'s form and reports which fields were filled, never a value', async () => {
    const { host, state, requests } = fakeHost({ ...OFFICIAL, url: 'https://www.citapreviadnie.es/citaPreviaDni/InicioDNINIE.action' })
    host.showForm = vi.fn(async () => ({ status: 'filled' as const, filled: ['numero', 'letra', 'equipo'], failed: ['validez'] }))
    const result = await runTool('show_form', { form_id: 'datos-dni' }, host, state)
    expect(result.isError).toBe(false)
    expect(result.content).toContain('Rellenados: Número de documento, Letra, Equipo de expedición.')
    expect(result.content).toContain('No se pudieron copiar: Fecha de validez.')
    expect(result.content).toContain('Dejó en blanco: Número de soporte.')
    expect(host.showForm).toHaveBeenCalledWith(expect.objectContaining({ tabId: 1, present: ['numero', 'letra', 'equipo', 'validez', 'soporte'] }))
    // The tool itself only asks the page which fields it has: it never sends a fill.
    expect(requests.map((r) => r.op)).toEqual(['form'])
  })

  it('takes a form id and nothing else', () => {
    expect(TOOL_INPUTS.show_form.safeParse({ form_id: 'datos-dni', values: { numero: '1' } }).success).toBe(false)
  })

  it('refuses a form the open site does not declare, and pages without the fields', async () => {
    const dni = fakeHost()
    dni.host.showForm = vi.fn()
    expect((await runTool('show_form', { form_id: 'otro' }, dni.host, dni.state)).content).toContain('Formularios de esta sede: datos-dni')
    ;(dni.browser.page as ReturnType<typeof vi.fn>).mockResolvedValue({ present: [] })
    expect((await runTool('show_form', { form_id: 'datos-dni' }, dni.host, dni.state)).isError).toBe(true)
    const other = fakeHost({ id: 1, url: 'https://www.casa47.es/', title: 'Casa 47' })
    other.host.showForm = vi.fn()
    expect((await runTool('show_form', { form_id: 'datos-dni' }, other.host, other.state)).isError).toBe(true)
    expect(dni.host.showForm).not.toHaveBeenCalled()
    expect(other.host.showForm).not.toHaveBeenCalled()
  })

  it('falls back to pointing when the person declines', async () => {
    const { host, state } = fakeHost()
    host.showForm = vi.fn(async () => ({ status: 'declined' as const }))
    const result = await runTool('show_form', { form_id: 'datos-dni' }, host, state)
    expect(result.isError).toBe(false)
    expect(result.content).toContain('point_to')
  })
})
