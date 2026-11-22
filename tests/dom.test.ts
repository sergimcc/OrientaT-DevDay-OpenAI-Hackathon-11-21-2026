// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Registry, guidedClick, readOutline, readTable, redact } from '../src/page/dom'
import { FRAME_TTL_MS, frameShown, hideFrame, showFrame } from '../src/page/frame'
import { clearGuide, guideShown, showGuide } from '../src/page/guide'
import { halfMask, isSensitiveField, startMasking } from '../src/page/mask'
import { PLUGINS } from '../src/plugins/registry'
import type { PolicyContext } from '../src/policy'

const CTX: PolicyContext = { officialHosts: ['citapreviadnie.es', 'casa47.es'], userOnly: ['Reservar'] }

const PAGE = `
  <h1>Cita previa DNI</h1>
  <div style="display:none">texto oculto</div>
  <script>var x = 'nunca'</script>
  <p>Titular: 12345678Z · NIE X1234567L · IBAN ES91 2100 0418 4502 0005 1332 · NUSS 28/12345678/90</p>
  <p>Contacto: ana.garcia@example.com, móvil 612 345 678. Información: 060 o 900 123 456.</p>
  <nav>
    <a id="ayuda" href="https://www.citapreviadnie.es/citaPreviaDni/ayuda.jsp">Ayuda</a>
    <a id="fuera" href="https://www.example.com/gestoria">Gestoría que te lo hace</a>
    <button id="menu" aria-expanded="false" aria-controls="m1">Menú</button>
  </nav>
  <form action="/reservar">
    <label for="dni">Número de DNI</label><input id="dni" value="12345678Z" required />
    <label for="fecha">Fecha de validez</label><input id="fecha" value="" />
    <label for="prov">Provincia</label>
    <select id="prov"><option value="">Elige</option><option value="m" selected>Madrid</option></select>
    <label><input type="checkbox" id="acepto" checked /> Acepto las condiciones</label>
    <button id="tipo" type="button">Cambiar tipo de documento</button>
    <a id="dentro" href="https://www.citapreviadnie.es/citaPreviaDni/oficinas.jsp">Ver oficinas</a>
    <button id="enviar">Reservar</button>
  </form>
  <button id="pagar">Pagar tasa</button>
  <table aria-label="Oficinas">
    <tr><th>Oficina</th><th>Teléfono</th></tr>
    <tr><td>Centro</td><td>612 000 111</td></tr>
  </table>
`

function refOf(outline: string, name: string): string {
  const match = new RegExp(`\\[([et]\\d+)\\] [a-z ]+ "${name}`).exec(outline)
  if (!match?.[1]) throw new Error(`no ref for ${name} in:\n${outline}`)
  return match[1]
}

describe('redact', () => {
  it('masks Spanish identifiers, e-mails and mobile numbers, and keeps public help lines', () => {
    const text = redact('DNI 12345678-Z, NIE Y-1234567-X, CIF B12345678, IBAN ES9121000418450200051332, NUSS 281234567890, a@b.es, +34 612 345 678, 060, 900 123 456')
    expect(text).not.toMatch(/12345678|1234567|ES91|281234567890|a@b\.es|612/)
    expect(text).toContain('[DNI oculto]')
    expect(text).toContain('[NIE oculto]')
    expect(text).toContain('[CIF oculto]')
    expect(text).toContain('[IBAN oculto]')
    expect(text).toContain('[NUSS oculto]')
    expect(text).toContain('[email oculto]')
    expect(text).toContain('[teléfono oculto]')
    expect(text).toContain('060')
    expect(text).toContain('900 123 456')
  })
})

describe('page outline', () => {
  let registry: Registry
  beforeEach(() => {
    document.body.innerHTML = PAGE
    registry = new Registry()
  })

  it('never contains what the person typed or chose, only the field state', () => {
    const { outline } = readOutline(document, registry, CTX)
    expect(outline).toMatch(/textbox "Número de DNI" \(rellenado, obligatorio\)/)
    expect(outline).toMatch(/textbox "Fecha de validez" \(vacío\)/)
    expect(outline).toMatch(/select "Provincia" \(elegido\)/)
    expect(outline).toMatch(/checkbox "Acepto las condiciones" \(marcado\)/)
    expect(outline).not.toContain('Madrid')
    expect(outline).not.toContain('12345678')
  })

  it('masks personal data in the page text and tables, and leaves out hidden content', () => {
    const { outline } = readOutline(document, registry, CTX)
    for (const secret of ['12345678Z', 'X1234567L', 'ES91', '28/12345678/90', 'ana.garcia', '612 345 678', '612 000 111']) expect(outline).not.toContain(secret)
    expect(outline).toContain('[DNI oculto]')
    expect(outline).toContain('# Cita previa DNI')
    expect(outline).not.toContain('texto oculto')
    expect(outline).not.toContain('nunca')
    const table = readTable(registry, refOf(outline, 'Oficinas'))
    expect(JSON.stringify(table)).not.toContain('612 000 111')
  })

  it('tags every control with its class', () => {
    const { outline, classes } = readOutline(document, registry, CTX)
    expect(classes[refOf(outline, 'Ayuda')]).toBe('nav')
    expect(classes[refOf(outline, 'Menú')]).toBe('nav')
    expect(classes[refOf(outline, 'Gestoría')]).toBe('external')
    expect(classes[refOf(outline, 'Número de DNI')]).toBe('field')
    expect(classes[refOf(outline, 'Provincia')]).toBe('field')
    expect(classes[refOf(outline, 'Reservar')]).toBe('action')
    expect(classes[refOf(outline, 'Cambiar tipo')]).toBe('action')
    expect(classes[refOf(outline, 'Pagar tasa')]).toBe('action')
    expect(outline).toMatch(/link "Ayuda" → \S*\/citaPreviaDni\/ayuda\.jsp \{nav\}/)
    expect(outline).toContain('móvil [teléfono oculto]')
    expect(outline).toMatch(/"Reservar" \{acción: la pulsa la persona\}/)
  })

  it('keeps refs stable across reads and filters by query without accents', () => {
    const first = refOf(readOutline(document, registry, CTX).outline, 'Número de DNI')
    const narrowed = readOutline(document, registry, CTX, { query: 'numero de dni' }).outline
    expect(refOf(narrowed, 'Número de DNI')).toBe(first)
    expect(narrowed).not.toContain('Oficinas')
  })
})

describe('guided click (page side)', () => {
  let registry: Registry
  let outline: string
  beforeEach(() => {
    document.body.innerHTML = PAGE
    registry = new Registry()
    outline = readOutline(document, registry, CTX).outline
  })

  it('presses a control that only moves around the site', () => {
    const clicked = vi.fn()
    document.getElementById('menu')?.addEventListener('click', clicked)
    expect(guidedClick(registry, refOf(outline, 'Menú'), CTX)).toEqual({ ok: true, name: 'Menú' })
    expect(clicked).toHaveBeenCalledOnce()
  })

  it.each([
    ['Número de DNI', 'field'],
    ['Acepto las condiciones', 'field'],
    ['Reservar', 'action'],
    ['Cambiar tipo', 'action'],
    ['Pagar tasa', 'action'],
    ['Gestoría', 'external'],
  ])('refuses %s (%s) and never dispatches a click', (name, cls) => {
    const ref = refOf(outline, name)
    const el = registry.get(ref) as HTMLElement
    const clicked = vi.fn()
    el.addEventListener('click', clicked)
    const result = guidedClick(registry, ref, CTX)
    expect(result.ok).toBe(false)
    expect(result).toMatchObject({ refused: cls })
    expect(clicked).not.toHaveBeenCalled()
  })

  it('checks the live element, so a link turned into a submit button after the read is refused', () => {
    const ref = refOf(outline, 'Ayuda')
    const link = registry.get(ref) as HTMLElement
    link.textContent = 'Enviar solicitud'
    expect(guidedClick(registry, ref, CTX)).toMatchObject({ ok: false, refused: 'action' })
  })

  it('refuses names the site map reserves for the person', () => {
    document.body.insertAdjacentHTML('beforeend', '<a id="x" href="https://www.casa47.es/solicitud">Reservar ahora</a>')
    const fresh = readOutline(document, registry, CTX).outline
    expect(guidedClick(registry, refOf(fresh, 'Reservar ahora'), CTX)).toMatchObject({ ok: false, refused: 'action' })
  })

  it('reports a ref that is gone', () => {
    expect(guidedClick(registry, 'e999', CTX)).toMatchObject({ ok: false })
  })
})

describe('guide highlight', () => {
  it('shows one highlight at a time, outside the outline, and clears it', () => {
    document.body.innerHTML = PAGE
    const field = document.getElementById('dni') as Element
    showGuide(field, 'Escribe aquí tu número de DNI')
    showGuide(field, 'Otra instrucción')
    expect(document.querySelectorAll('#asistente-tramites-guide')).toHaveLength(1)
    expect(guideShown()).toBe(true)
    const { outline } = readOutline(document, new Registry(), CTX)
    expect(outline).not.toContain('Otra instrucción')
    clearGuide()
    expect(document.getElementById('asistente-tramites-guide')).toBeNull()
    expect(guideShown()).toBe(false)
  })
})

describe('assistant-at-work frame', () => {
  it('shows one frame outside the outline, renews it, and hides it', () => {
    document.body.innerHTML = PAGE
    showFrame('El asistente está leyendo esta página')
    showFrame('El asistente te espera en el panel')
    expect(document.querySelectorAll('#asistente-tramites-frame')).toHaveLength(1)
    expect(frameShown()).toBe(true)
    const { outline } = readOutline(document, new Registry(), CTX)
    expect(outline).not.toContain('El asistente')
    hideFrame()
    expect(document.getElementById('asistente-tramites-frame')).toBeNull()
    expect(frameShown()).toBe(false)
  })

  it('goes away by itself when the panel stops renewing it', () => {
    vi.useFakeTimers()
    try {
      showFrame('El asistente está leyendo esta página')
      vi.advanceTimersByTime(FRAME_TTL_MS - 1000)
      showFrame('El asistente está leyendo esta página')
      vi.advanceTimersByTime(FRAME_TTL_MS - 1000)
      expect(frameShown()).toBe(true)
      vi.advanceTimersByTime(1000)
      expect(frameShown()).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('sensitive fields covered on screen', () => {
  it('keeps the first half of a value and covers the rest', () => {
    expect(halfMask('12345678Z')).toBe('1234*****')
    expect(halfMask('X1234567L')).toBe('X123*****')
    expect(halfMask('612 345 678')).toBe('612 3** ***')
    expect(halfMask('ana.garcia@example.com')).toBe('ana.g*****@example.com')
    expect(halfMask('ab')).toBe('**')
  })

  it('recognises personal-data fields by label or value, and leaves the rest', () => {
    document.body.innerHTML = `
      <label for="a">Número de DNI</label><input id="a">
      <label for="b">Teléfono móvil</label><input id="b" type="tel">
      <label for="c">Correo electrónico</label><input id="c" type="email">
      <label for="d">Letra del soporte</label><input id="d">
      <label for="e">Provincia</label><input id="e">
      <label for="f">Observaciones</label><input id="f" value="12345678Z">
      <label for="g">Acepto</label><input id="g" type="checkbox">`
    const sensitive = [...document.querySelectorAll('input')].filter((el) => isSensitiveField(el)).map((el) => el.id)
    expect(sensitive).toEqual(['a', 'b', 'c', 'd', 'f'])
  })

  it('covers every field of the cita previa DNI form, as the real page labels them', () => {
    document.body.innerHTML = `
      <label for="numDocumento" title="Número y Letra del Documento ">Número y Letra del Documento:</label><input type="text" name="numDocumento" id="numDocumento">
      <label for="letraDocumento" title="Número y Letra del Documento ">Letra:</label><input type="text" name="letraDocumento" id="letraDocumento">
      <label for="codEquipo">Equipo de Expedición:</label><input type="text" name="codEquipo" id="codEquipo">
      <label for="fechaValidez">Fecha de Validez:</label><input type="text" name="fechaValidez" id="fechaValidez">
      <label for="numSoporte">Número de Soporte:</label><input type="text" name="numSoporte" id="numSoporte">
      <label for="codSeguridad">Introduzca los caracteres que visualiza o escucha a continuación: <input type="text" name="codSeguridad" id="codSeguridad"></label>`
    const sensitive = [...document.querySelectorAll('input')].filter((el) => isSensitiveField(el)).map((el) => el.id)
    expect(sensitive).toEqual(['numDocumento', 'letraDocumento', 'codEquipo', 'fechaValidez', 'numSoporte', 'codSeguridad'])
  })

  it('hides the typed text on screen but keeps the real value for the form', () => {
    document.body.innerHTML = '<label for="dni">Número de DNI</label><input id="dni" value="12345678Z">'
    const input = document.getElementById('dni') as HTMLInputElement
    input.getBoundingClientRect = () => ({ left: 10, top: 10, width: 200, height: 30, right: 210, bottom: 40, x: 10, y: 10, toJSON() {} }) as DOMRect
    document.elementFromPoint = () => input
    startMasking(document)
    expect(input.value).toBe('12345678Z')
    expect(input.style.getPropertyValue('color')).toBe('transparent')
    expect(document.getElementById('asistente-tramites-mask')).not.toBeNull()
    const { outline } = readOutline(document, new Registry(), CTX)
    expect(outline).not.toContain('1234')
  })
})

describe('cita previa DNI form («Acceso con datos DNI/NIE»)', () => {
  const dni = PLUGINS.find((p) => p.id === 'cita-dni')!
  const DNI_CTX: PolicyContext = { officialHosts: dni.domains, userOnly: dni.user_only ?? [] }
  const FORM = `
    <h1>Cita Previa DNI</h1>
    <a href="https://www.citapreviadnie.es/citaPreviaDni/Acceso.action">Acceso con datos DNI/NIE</a>
    <form action="https://www.citapreviadnie.es/citaPreviaDni/Enviar.action" method="post">
      <label for="numDocumento">Número de Documento</label><input id="numDocumento" type="text" value="12345678" />
      <label for="letraDocumento">Letra</label><input id="letraDocumento" type="text" value="Z" />
      <label for="codEquipo">Equipo de Expedición</label><input id="codEquipo" type="text" />
      <label for="fechaValidez">Fecha de Validez</label><input id="fechaValidez" type="text" />
      <label for="numSoporte">Número de Soporte</label><input id="numSoporte" type="text" />
      <label for="codSeguridad">Código de Seguridad</label><input id="codSeguridad" type="text" value="x7Kq" />
      <input type="submit" value="Enviar datos" />
    </form>`

  it('classifies every control as the map promises, without leaking values', () => {
    document.body.innerHTML = FORM
    const { outline, classes } = readOutline(document, new Registry(), DNI_CTX)
    const cls = (name: string) => classes[refOf(outline, name)]
    expect(cls('Acceso con datos DNI/NIE')).toBe('nav')
    for (const field of ['Número de Documento', 'Letra', 'Equipo de Expedición', 'Fecha de Validez', 'Número de Soporte', 'Código de Seguridad']) {
      expect(cls(field)).toBe('field')
    }
    expect(cls('Enviar datos')).toBe('action')
    expect(outline).not.toContain('12345678')
    expect(outline).not.toContain('x7Kq')
  })

  it('names a submit input by its caption, not by the field before it', () => {
    document.body.innerHTML = FORM
    const { outline } = readOutline(document, new Registry(), DNI_CTX)
    expect(outline).toMatch(/\[e\d+\] button "Enviar datos"/)
  })

  it('does not let the assistant press «Enviar datos»', () => {
    document.body.innerHTML = FORM
    const registry = new Registry()
    const { outline } = readOutline(document, registry, DNI_CTX)
    expect(guidedClick(registry, refOf(outline, 'Enviar datos'), DNI_CTX)).toMatchObject({ ok: false, refused: 'action' })
  })
})
