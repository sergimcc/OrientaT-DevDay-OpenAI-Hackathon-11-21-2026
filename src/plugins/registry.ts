import { RAW_PLUGINS } from '../../plugins/index'
import { fold, isOfficialHost } from '../policy'
import { checkPlugin } from './schema'
import type { PanelForm, Procedure, SitePlugin } from './schema'

// Every bundled site map, checked once at load. A map that fails its checks is left out rather than
// trusted: the tests make sure none does.

function load(): SitePlugin[] {
  const out: SitePlugin[] = []
  for (const raw of RAW_PLUGINS) {
    const { plugin, problems } = checkPlugin(raw)
    if (plugin && problems.length === 0) out.push(plugin)
  }
  return out
}

export const PLUGINS: SitePlugin[] = load()

/** Every host the extension treats as official. Each covers its subdomains. */
export function officialHosts(plugins: SitePlugin[] = PLUGINS): string[] {
  return [...new Set(plugins.flatMap((p) => p.domains))].sort()
}

export function pluginById(id: string, plugins: SitePlugin[] = PLUGINS): SitePlugin | undefined {
  return plugins.find((p) => p.id === id)
}

/** The map for the site a URL belongs to. The most specific domain wins. */
export function pluginForUrl(url: string | undefined, plugins: SitePlugin[] = PLUGINS): SitePlugin | undefined {
  if (!url) return undefined
  let host: string
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return undefined
    host = parsed.hostname
  } catch {
    return undefined
  }
  let best: { plugin: SitePlugin; length: number } | undefined
  for (const plugin of plugins) {
    for (const domain of plugin.domains) {
      if (isOfficialHost(host, [domain]) && (!best || domain.length > best.length)) best = { plugin, length: domain.length }
    }
  }
  return best?.plugin
}

/** The panel forms a site map declares, in step order. */
export function formsOf(plugin: SitePlugin | undefined): PanelForm[] {
  return (plugin?.procedures ?? []).flatMap((proc) => proc.steps.flatMap((step) => (step.form ? [step.form] : [])))
}

/**
 * A panel form, looked up in the map of the site the URL belongs to and nowhere else: a form can only
 * ever be used on its own site.
 */
export function formForUrl(url: string | undefined, formId: string, plugins: SitePlugin[] = PLUGINS): PanelForm | undefined {
  return formsOf(pluginForUrl(url, plugins)).find((form) => form.id === formId)
}

export type ProcedureHit = { plugin: SitePlugin; procedure: Procedure; score: number }

function words(text: string): string[] {
  return fold(text)
    .replace(/[^\p{L}\p{N}@]+/gu, ' ')
    .split(' ')
    .filter((w) => w.length > 2 && !STOP.has(w))
}

const STOP = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'en', 'para', 'por', 'con', 'una', 'uno', 'que', 'mis', 'mi', 'quiero', 'como', 'hacer', 'pedir', 'necesito', 'tramite'])

/**
 * Procedures that match a person's words, best first. Accents and case do not matter. A keyword phrase
 * found whole counts most, then words in the title, keywords, summary and site name.
 */
export function searchProcedures(query: string, plugins: SitePlugin[] = PLUGINS, limit = 5): ProcedureHit[] {
  const q = fold(query)
  const qWords = words(query)
  if (!qWords.length && !q) return []
  const hits: ProcedureHit[] = []
  for (const plugin of plugins) {
    for (const procedure of plugin.procedures) {
      let score = 0
      for (const keyword of procedure.keywords) {
        const k = fold(keyword)
        if (k && ` ${q} `.includes(` ${k} `)) score += 10 + k.split(' ').length * 2
      }
      const title = new Set(words(procedure.title))
      const keys = new Set(procedure.keywords.flatMap(words))
      const summary = new Set(words(procedure.summary))
      const site = new Set(words(`${plugin.name} ${plugin.authority} ${plugin.id}`))
      for (const w of qWords) {
        const prefix = (set: Set<string>) => [...set].some((t) => t === w || (w.length > 4 && t.startsWith(w.slice(0, -1))))
        if (prefix(title)) score += 4
        if (prefix(keys)) score += 3
        if (prefix(summary)) score += 1
        if (prefix(site)) score += 2
      }
      if (score > 0) hits.push({ plugin, procedure, score })
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}
