import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { RAW_PLUGINS } from '../plugins/index'
import { PLUGINS, officialHosts, pluginForUrl, searchProcedures } from '../src/plugins/registry'
import { checkPlugin } from '../src/plugins/schema'

describe('bundled site maps', () => {
  it('lists every plugins/*.json in plugins/index.ts', () => {
    const files = readdirSync('plugins').filter((f) => f.endsWith('.json'))
    expect(RAW_PLUGINS).toHaveLength(files.length)
  })

  it.each(readdirSync('plugins').filter((f) => f.endsWith('.json')))('%s passes every check', (file) => {
    const { plugin, problems } = checkPlugin(JSON.parse(readFileSync(`plugins/${file}`, 'utf8')))
    expect(problems).toEqual([])
    expect(plugin?.id).toBe(file.replace(/\.json$/, ''))
  })

  it('loads all of them, with unique ids, and marks unwalked maps as drafts', () => {
    expect(PLUGINS).toHaveLength(RAW_PLUGINS.length)
    expect(new Set(PLUGINS.map((p) => p.id)).size).toBe(PLUGINS.length)
    for (const plugin of PLUGINS) expect(plugin.status).toBe('draft')
  })

  it('rejects a map with a url off its own domains', () => {
    const bad = { ...(RAW_PLUGINS[0] as object), home: 'https://example.com/' }
    expect(checkPlugin(bad).problems.map((p) => p.message).join()).toMatch(/home is not on the site's domains/)
  })
})

describe('registry', () => {
  it('knows the official hosts', () => {
    expect(officialHosts()).toEqual(expect.arrayContaining(['citapreviadnie.es', 'casa47.es']))
  })

  it('finds the site map for a url, including subdomains, and only over https', () => {
    expect(pluginForUrl('https://www.citapreviadnie.es/citaPreviaDni/')?.id).toBe('cita-dni')
    expect(pluginForUrl('https://portal.casa47.es/')?.id).toBe('casa47')
    expect(pluginForUrl('http://www.casa47.es/')).toBeUndefined()
    expect(pluginForUrl('https://example.com/')).toBeUndefined()
  })

  it.each([
    ['quiero renovar el dni', 'cita-dni', 'pedir-cita'],
    ['CITA PASAPORTE', 'cita-dni', 'pedir-cita'],
    ['anular cita dni', 'cita-dni', 'consultar-anular'],
    ['qué llevar a la cita del dni', 'cita-dni', 'requisitos'],
    ['vivienda de alquiler asequible', 'casa47', 'alquiler-asequible'],
    ['listado adjudicación casa 47', 'casa47', 'listados-adjudicacion'],
    ['telefono 047', 'casa47', 'telefono-047'],
  ])('search "%s" finds %s/%s first', (query, plugin, procedure) => {
    const [first] = searchProcedures(query)
    expect(first?.plugin.id).toBe(plugin)
    expect(first?.procedure.id).toBe(procedure)
  })

  it('returns nothing for unrelated words', () => {
    expect(searchProcedures('receta de paella')).toEqual([])
  })
})
