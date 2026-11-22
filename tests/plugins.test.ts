import { describe, expect, it } from 'vitest'
import { PLUGINS, searchProcedures } from '../src/plugins/registry'
import { classify } from '../src/policy'
import { policyFor } from '../src/trust'

describe('cita previa DNI map', () => {
  const dni = PLUGINS.find((p) => p.id === 'cita-dni')!
  const booking = dni.procedures.find((p) => p.id === 'pedir-cita')!

  it('identifies people with the data printed on their ID card', () => {
    expect(booking.login).toEqual(['datos_documento'])
  })

  it('collects the document data in one panel form, and leaves the code and «Enviar datos» to the person', () => {
    const titles = booking.steps.map((s) => s.title)
    for (const step of ['Datos del documento', 'Código de seguridad', 'Enviar los datos']) {
      expect(titles).toContain(step)
    }
    const form = booking.steps.find((s) => s.title === 'Datos del documento')?.form
    expect(form?.id).toBe('datos-dni')
    // The ids of the inputs on the live page, read on 2026-11-21. The security code is not among them.
    expect(form?.fields.map((f) => f.target)).toEqual(['numDocumento', 'letraDocumento', 'codEquipo', 'fechaValidez', 'numSoporte'])
    expect(form?.fields.filter((f) => f.optional).map((f) => f.id)).toEqual(['soporte'])
    expect(dni.user_only).toContain('Enviar datos')
    expect(booking.steps.find((s) => s.title === 'Enviar los datos')?.user_only).toEqual(['Enviar datos'])
  })

  it('is found from what people say', () => {
    expect(searchProcedures('quiero pedir cita para renovar el DNI')[0]?.procedure.id).toBe('pedir-cita')
  })
})

describe('Casa 47 map', () => {
  const casa47 = PLUGINS.find((p) => p.id === 'casa47')!
  const rent = casa47.procedures.find((p) => p.id === 'alquiler-asequible')!

  it('starts in the portal and walks it screen by screen up to the application', () => {
    expect(rent.entry_url).toBe('https://portal.casa47.es/')
    expect(rent.steps.map((s) => s.title)).toEqual([
      'Elegir cómo buscar',
      'Indicar filtros iniciales',
      'Explorar catálogo y mapa',
      'Revisar ficha de la vivienda',
      'Consultar la convocatoria',
      'Iniciar la solicitud',
    ])
  })

  it('leaves the filter buttons and the draft choice to the person', () => {
    const userOnly = rent.steps.flatMap((s) => s.user_only ?? [])
    for (const name of ['Comprobar', 'Iniciar solicitud', 'Retomar solicitud', 'Descartar']) expect(userOnly).toContain(name)
    const ctx = policyFor('https://portal.casa47.es/#/solicitud/convocatoria')
    expect(classify({ kind: 'link', name: 'Descartar y empezar de nuevo', href: 'https://portal.casa47.es/#/solicitud' }, ctx)).toBe('action')
  })

  it('never asks for income in the chat', () => {
    expect(rent.steps.find((s) => s.title === 'Indicar filtros iniciales')?.guidance).toMatch(/No pidas ni almacenes ingresos en el chat/)
  })

  it('is found from what people say', () => {
    expect(searchProcedures('quiero solicitar vivienda de alquiler asequible')[0]?.procedure.id).toBe('alquiler-asequible')
  })
})
