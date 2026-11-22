// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fillPageForm, probePageForm } from '../src/agent/formFill'
import type { Browser } from '../src/agent/tools'
import { fieldProblem, fillForm, probeForm } from '../src/page/form'
import type { PageRequest } from '../src/page/messages'
import { formForUrl } from '../src/plugins/registry'

const URL = 'https://www.citapreviadnie.es/citaPreviaDni/InicioDNINIE.action'

// The inputs of the live page, as read on 2026-11-21.
const PAGE = `
  <form id="Autentificar" name="formulario" action="Autentificar.action" method="post">
    <input type="hidden" name="idDocumento" value="D" id="idDocumento" />
    <input type="text" name="numDocumento" id="numDocumento" maxlength="8" value="" />
    <input type="text" name="letraDocumento" id="letraDocumento" maxlength="1" value="" />
    <input type="text" name="codEquipo" id="codEquipo" maxlength="9" value="" />
    <input type="text" name="fechaValidez" id="fechaValidez" maxlength="10" value="" />
    <input type="text" name="numSoporte" id="numSoporte" maxlength="9" value="antes" />
    <input type="text" name="codSeguridad" id="codSeguridad" maxlength="10" value="" />
    <input class="boton" type="submit" value="Enviar datos" />
  </form>
`

const VALUES = { numero: '12345678', letra: 'z', equipo: ' 28123a4b5 ', validez: '01/02/2031', soporte: '' }
const value = (id: string) => (document.getElementById(id) as HTMLInputElement).value

beforeEach(() => {
  document.body.innerHTML = PAGE
})

describe('panel form, page side', () => {
  it('copies each value into the field the site map names, and nothing else', () => {
    const submit = vi.fn((event: Event) => event.preventDefault())
    document.querySelector('form')!.addEventListener('submit', submit)
    const heard: string[] = []
    document.addEventListener('input', (event) => heard.push((event.target as HTMLInputElement).id))

    expect(fillForm(document, URL, 'datos-dni', VALUES)).toEqual({ filled: ['numero', 'letra', 'equipo', 'validez'], missing: [], rejected: [] })
    expect(value('numDocumento')).toBe('12345678')
    expect(value('letraDocumento')).toBe('Z')
    expect(value('codEquipo')).toBe('28123A4B5')
    expect(value('fechaValidez')).toBe('01/02/2031')
    // Left empty in the panel: the page field stays as it was. The security code is never touched.
    expect(value('numSoporte')).toBe('antes')
    expect(value('codSeguridad')).toBe('')
    expect(value('idDocumento')).toBe('D')
    expect(heard).toEqual(['numDocumento', 'letraDocumento', 'codEquipo', 'fechaValidez'])
    expect(submit).not.toHaveBeenCalled()
  })

  it('ignores anything the form does not declare', () => {
    fillForm(document, URL, 'datos-dni', { ...VALUES, codSeguridad: 'ABCD', seguridad: 'ABCD', idDocumento: 'X' })
    expect(value('codSeguridad')).toBe('')
    expect(value('idDocumento')).toBe('D')
  })

  it('checks every value again in the page', () => {
    const result = fillForm(document, URL, 'datos-dni', { numero: '1234567890', letra: '9', equipo: 'ABC', validez: 'mañana', soporte: 'AAA000000' })
    expect(result).toEqual({ filled: ['equipo', 'soporte'], missing: [], rejected: ['numero', 'letra', 'validez'] })
    expect(value('numDocumento')).toBe('')
    expect(value('fechaValidez')).toBe('')
  })

  it('accepts PERMANENTE as the date, in any case', () => {
    fillForm(document, URL, 'datos-dni', { validez: 'permanente' })
    expect(value('fechaValidez')).toBe('PERMANENTE')
  })

  it('says which fields are missing or cannot be written', () => {
    document.getElementById('codEquipo')!.remove()
    ;(document.getElementById('fechaValidez') as HTMLInputElement).readOnly = true
    expect(probeForm(document, URL, 'datos-dni')).toEqual({ present: ['numero', 'letra', 'soporte'] })
    expect(fillForm(document, URL, 'datos-dni', VALUES)).toMatchObject({ filled: ['numero', 'letra'], missing: ['equipo', 'validez'] })
  })

  it('does nothing on another site, on a page without a map, or for an unknown form', () => {
    for (const url of ['https://www.casa47.es/', 'https://sede.example.gob.es/', 'https://citapreviadnie.es.evil.example/']) {
      expect(fillForm(document, url, 'datos-dni', VALUES)).toHaveProperty('error')
      expect(probeForm(document, url, 'datos-dni')).toHaveProperty('error')
    }
    expect(fillForm(document, URL, 'otro', VALUES)).toHaveProperty('error')
    expect(value('numDocumento')).toBe('')
  })

  it('explains a value that does not fit, for the panel', () => {
    const fields = Object.fromEntries(formForUrl(URL, 'datos-dni')!.fields.map((f) => [f.id, f]))
    expect(fieldProblem(fields.numero!, '')).toBe('Falta este dato.')
    expect(fieldProblem(fields.soporte!, '')).toBeNull()
    expect(fieldProblem(fields.numero!, '1234567A')).toContain('formato')
    expect(fieldProblem(fields.validez!, '1/2/2031')).toContain('dd/mm/aaaa')
    expect(fieldProblem(fields.letra!, 'z')).toBeNull()
  })
})

describe('panel form, panel side', () => {
  function browserWith(run: (request: PageRequest, frameId: number) => unknown) {
    const requests: PageRequest[] = []
    const browser = {
      activeTab: vi.fn(),
      navigate: vi.fn(),
      frames: vi.fn(async () => [0, 7]),
      page: vi.fn(async (_tab: number, request: PageRequest, frameId = 0) => {
        requests.push(request)
        return run(request, frameId)
      }),
    } as unknown as Browser
    return { browser, requests }
  }

  it('sends the values to the page and gets back field ids only', async () => {
    const { browser, requests } = browserWith((request, frameId) => {
      if (frameId === 7) return { error: 'Esta página no tiene ese formulario en su mapa.' }
      return request.op === 'fill' ? fillForm(document, URL, request.form, request.values) : probeForm(document, URL, (request as { form: string }).form)
    })
    expect(await probePageForm(browser, 1, 'datos-dni', [])).toEqual(['numero', 'letra', 'equipo', 'validez', 'soporte'])
    const result = await fillPageForm(browser, 1, 'datos-dni', { ...VALUES, validez: 'x' }, [])
    expect(result).toEqual({ filled: ['numero', 'letra', 'equipo'], failed: ['validez'] })
    expect(JSON.stringify(result)).not.toContain('12345678')
    expect(requests.filter((r) => r.op === 'fill')).toHaveLength(2)
  })

  it('reports nothing filled when the page is gone', async () => {
    const { browser } = browserWith(() => {
      throw new Error('La página cambió mientras se leía.')
    })
    expect(await fillPageForm(browser, 1, 'datos-dni', VALUES, [])).toEqual({ filled: [], failed: [] })
  })
})
