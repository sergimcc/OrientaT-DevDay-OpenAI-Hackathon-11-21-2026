import { describe, expect, it } from 'vitest'
import { classify, fold, isOfficialUrl } from '../src/policy'
import type { PolicyContext } from '../src/policy'

const CTX: PolicyContext = { officialHosts: ['citapreviadnie.es', 'casa47.es'] }

describe('classify', () => {
  it('treats every field kind as a field', () => {
    for (const kind of ['textbox', 'select', 'checkbox', 'radio', 'combobox', 'file input', 'password input', 'date input']) {
      expect(classify({ kind, name: 'Algo' }, CTX)).toBe('field')
    }
  })

  it('lets official links, tabs and menus through', () => {
    expect(classify({ kind: 'link', name: 'Ayuda', href: 'https://www.citapreviadnie.es/ayuda' }, CTX)).toBe('nav')
    expect(classify({ kind: 'link', name: 'Convocatoria', href: 'https://portal.casa47.es/' }, CTX)).toBe('nav')
    expect(classify({ kind: 'tab', name: 'Requisitos' }, CTX)).toBe('nav')
    expect(classify({ kind: 'button', name: 'Más información', toggles: true }, CTX)).toBe('nav')
  })

  it('marks action words as actions, in Spanish, co-official languages and English, ignoring accents', () => {
    for (const name of ['Enviar', 'Confirmar cita', 'PRESENTACIÓN', 'Firmar y enviar', 'Pagar', 'Anular', 'Guardar', 'Signar', 'Bidali', 'Submit', 'Iniciar sesión']) {
      expect(classify({ kind: 'link', name, href: 'https://www.casa47.es/x' }, CTX)).toBe('action')
    }
  })

  it('does not match parts of words', () => {
    expect(classify({ kind: 'link', name: 'Pagos realizados', href: 'https://www.casa47.es/pagos' }, CTX)).toBe('nav')
  })

  it('treats any button in a form, submits and unknown buttons as actions', () => {
    expect(classify({ kind: 'button', name: 'Siguiente', inForm: true, buttonType: 'button' }, CTX)).toBe('action')
    expect(classify({ kind: 'button', name: 'Siguiente', buttonType: 'submit' }, CTX)).toBe('action')
    expect(classify({ kind: 'button', name: 'Abrir' }, CTX)).toBe('action')
    expect(classify({ kind: 'button', name: 'Abrir', toggles: true, inForm: true }, CTX)).toBe('action')
  })

  it('keeps links off the official sites out', () => {
    expect(classify({ kind: 'link', name: 'Gestoría', href: 'https://example.com' }, CTX)).toBe('external')
    expect(classify({ kind: 'link', name: 'Fake', href: 'https://casa47.es.example.com/' }, CTX)).toBe('external')
    expect(classify({ kind: 'link', name: 'Http', href: 'http://www.casa47.es/' }, CTX)).toBe('external')
    expect(classify({ kind: 'link', name: 'Script', href: 'javascript:void(0)' }, CTX)).toBe('action')
  })

  it('applies the site map names reserved for the person', () => {
    expect(classify({ kind: 'link', name: 'Tramitar', href: 'https://www.casa47.es/t' }, { ...CTX, userOnly: ['Tramitar'] })).toBe('action')
  })
})

describe('isOfficialUrl', () => {
  it('needs https, an official host and no credentials', () => {
    expect(isOfficialUrl('https://www.citapreviadnie.es/citaPreviaDni/', CTX.officialHosts)).toBe(true)
    expect(isOfficialUrl('http://www.citapreviadnie.es/', CTX.officialHosts)).toBe(false)
    expect(isOfficialUrl('https://user:pw@www.casa47.es/', CTX.officialHosts)).toBe(false)
    expect(isOfficialUrl('https://notcasa47.es/', CTX.officialHosts)).toBe(false)
    expect(isOfficialUrl('no es una url', CTX.officialHosts)).toBe(false)
  })
})

describe('fold', () => {
  it('drops accents, case and extra spaces', () => {
    expect(fold('  Presentación   DE la  Solicitud ')).toBe('presentacion de la solicitud')
  })
})
