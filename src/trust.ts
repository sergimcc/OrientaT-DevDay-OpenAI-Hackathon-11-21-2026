import { isOfficialHost } from './policy'
import type { PolicyContext } from './policy'
import { officialHosts, pluginForUrl } from './plugins/registry'

// Which sites the assistant may read and move around on.
//
// 1. Sites with a site map (plugins/*.json).
// 2. Public-administration domains: every *.gob.es site (the State) and the main domains of the regional
//    governments and the largest city halls. Listed here, so the extension's host access covers them.
// 3. Sites the person approved in this session, after the assistant found them with web search. The panel
//    shows the host and asks; Chrome then asks for access to that one site.
//
// Anything else is off limits: the assistant cannot read it, click on it or point at it.

export const GOV_DOMAINS = [
  'gob.es',
  // Comunidades y ciudades autónomas
  'juntadeandalucia.es', 'aragon.es', 'asturias.es', 'caib.es', 'gobiernodecanarias.org', 'cantabria.es',
  'jcyl.es', 'castillalamancha.es', 'gencat.cat', 'gva.es', 'juntaex.es', 'xunta.gal', 'comunidad.madrid',
  'madrid.org', 'carm.es', 'navarra.es', 'euskadi.eus', 'larioja.org', 'ceuta.es', 'melilla.es',
  // Ayuntamientos grandes
  'madrid.es', 'barcelona.cat',
]

export type Trust = 'mapped' | 'government' | 'approved' | 'none'

/** Every host trusted right now: mapped sites, public-administration domains, and `approved` hosts. */
export function trustedHosts(approved: string[] = []): string[] {
  return [...new Set([...officialHosts(), ...GOV_DOMAINS, ...approved.map((h) => h.toLowerCase())])].sort()
}

export function hostOf(url: string | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.hostname.toLowerCase() : null
  } catch {
    return null
  }
}

/** How far a page is trusted, for the site bar and the tools. */
export function trustOf(url: string | undefined, approved: string[] = []): Trust {
  const host = hostOf(url)
  if (!host) return 'none'
  if (pluginForUrl(url)) return 'mapped'
  if (isOfficialHost(host, GOV_DOMAINS)) return 'government'
  if (isOfficialHost(host, approved)) return 'approved'
  return 'none'
}

/** Host-permission patterns for the manifest: mapped and public-administration domains. */
export function hostPatterns(domains: string[]): string[] {
  return domains.flatMap((d) => [`https://${d}/*`, `https://*.${d}/*`])
}

/**
 * The policy context for a page: every trusted host, plus the control names the page's site map
 * reserves for the person (and any the caller adds).
 */
export function policyFor(url: string | undefined, opts: { approved?: string[]; userOnly?: string[] } = {}): PolicyContext {
  const plugin = pluginForUrl(url)
  const userOnly = new Set(opts.userOnly ?? [])
  for (const name of plugin?.user_only ?? []) userOnly.add(name)
  for (const proc of plugin?.procedures ?? []) for (const step of proc.steps) for (const name of step.user_only ?? []) userOnly.add(name)
  return { officialHosts: trustedHosts(opts.approved), userOnly: [...userOnly] }
}
