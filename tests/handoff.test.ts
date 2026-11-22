import { describe, expect, it } from 'vitest'
import { HANDOFF_LIMITS, cleanHandoff, handoffMessage, redactPersonalData } from '../src/handoff'

describe('hand-off from the website', () => {
  it('blanks identity numbers, contact details and bank accounts', () => {
    const out = redactPersonalData(
      'Mi DNI es 12345678Z (o 12.345.678-Z), NIE X1234567L, tel 612 345 678, +34 912345678, correo ana@example.com, cuenta ES91 2100 0418 4502 0005 1332, NSS 28 12345678 40',
    )
    for (const leak of ['12345678', '1234567L', '612 345', '912345678', 'ana@', '2100 0418', '12345678 40']) expect(out).not.toContain(leak)
  })

  it('keeps ordinary words and numbers', () => {
    const text = 'Renovar el DNI en Barcelona, caducó en 2024, somos 3 y tengo 65 años; la tasa son 12 euros'
    expect(redactPersonalData(text)).toBe(text)
  })

  it('requires text and url and drops malformed extras', () => {
    expect(cleanHandoff(null)).toBeNull()
    expect(cleanHandoff({ text: ' ', url: 'https://x.gob.es' })).toBeNull()
    expect(cleanHandoff({ text: 'Cita DNI', url: 42 })).toBeNull()
    expect(cleanHandoff({ text: 'Cita DNI', url: 'https://www.citapreviadnie.es/', procedure: { plugin: '../x', id: 'a' }, context: [1, ''] })).toEqual({
      type: 'handoff',
      text: 'Cita DNI',
      url: 'https://www.citapreviadnie.es/',
    })
  })

  it('carries the map procedure and the last few messages, trimmed and blanked', () => {
    const many = Array.from({ length: 10 }, (_, i) => `mensaje ${i}`)
    const r = cleanHandoff({
      text: 'Pedir cita para el DNI',
      url: 'https://www.citapreviadnie.es/',
      procedure: { plugin: 'cita-dni', id: 'pedir-cita' },
      context: [...many, `Mi DNI es 12345678Z   y vivo en Girona ${'x'.repeat(1000)}`],
    })!
    expect(r.procedure).toEqual({ plugin: 'cita-dni', id: 'pedir-cita' })
    expect(r.context).toHaveLength(HANDOFF_LIMITS.contextItems)
    const last = r.context!.at(-1)!
    expect(last.startsWith('Mi DNI es [dato personal] y vivo en Girona')).toBe(true)
    expect(last.length).toBe(HANDOFF_LIMITS.contextItem)
  })

  it('tells the assistant which map to open and what the person already said', () => {
    const msg = handoffMessage({
      text: 'Pedir cita para el DNI',
      url: 'https://www.citapreviadnie.es/',
      procedure: { plugin: 'cita-dni', id: 'pedir-cita' },
      context: ['Se me ha caducado el DNI', 'Vivo en Girona'],
      at: Date.now(),
    })
    expect(msg).toContain('cita-dni / pedir-cita')
    expect(msg).toContain('- Se me ha caducado el DNI\n- Vivo en Girona')
    // A task from an older build (text and url only) still reads as before.
    expect(handoffMessage({ text: 'Cita DNI', url: 'https://www.citapreviadnie.es/', at: 0 })).not.toContain('\n')
  })
})
