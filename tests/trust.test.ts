import { describe, expect, it } from 'vitest'
import { classify } from '../src/policy'
import { policyFor, trustOf, trustedHosts } from '../src/trust'

describe('trust', () => {
  it('ranks mapped sites, public-administration domains, approved sites and the rest', () => {
    expect(trustOf('https://www.citapreviadnie.es/citaPreviaDni/')).toBe('mapped')
    expect(trustOf('https://sede.seg-social.gob.es/')).toBe('government')
    expect(trustOf('https://tramits.gencat.cat/')).toBe('government')
    expect(trustOf('https://sede.valencia.es/')).toBe('none')
    expect(trustOf('https://sede.valencia.es/', ['sede.valencia.es'])).toBe('approved')
    expect(trustOf('http://sede.seg-social.gob.es/')).toBe('none')
    expect(trustOf('https://gob.es.example.com/')).toBe('none')
  })

  it('treats links to approved sites as navigation, and the rest as external', () => {
    const before = policyFor('https://www.citapreviadnie.es/')
    const after = policyFor('https://www.citapreviadnie.es/', { approved: ['sede.valencia.es'] })
    const link = { kind: 'link', name: 'Sede de Valencia', href: 'https://sede.valencia.es/sede/' }
    expect(classify(link, before)).toBe('external')
    expect(classify(link, after)).toBe('nav')
    expect(classify({ kind: 'link', name: 'Agencia', href: 'https://sede.agenciatributaria.gob.es/' }, before)).toBe('nav')
  })

  it('adds the control names the page site map reserves for the person', () => {
    expect(policyFor('https://www.citapreviadnie.es/').userOnly).toEqual(expect.arrayContaining(['Confirmar', 'Anular']))
  })

  it('lists every trusted host once', () => {
    const hosts = trustedHosts(['sede.valencia.es', 'SEDE.VALENCIA.ES'])
    expect(hosts).toEqual([...new Set(hosts)])
    expect(hosts).toEqual(expect.arrayContaining(['gob.es', 'casa47.es', 'sede.valencia.es']))
  })
})
