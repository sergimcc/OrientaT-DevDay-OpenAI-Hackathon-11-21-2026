import { build, context } from 'esbuild'
import { Resvg } from '@resvg/resvg-js'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'

const watch = process.argv.includes('--watch')
// `--safari` (npm run build:safari): the same extension for Safari, in dist-safari/ (see safariManifest).
const safari = process.argv.includes('--safari')
const outdir = safari ? 'dist-safari' : 'dist'

const shared = {
  bundle: true,
  minify: !watch,
  sourcemap: watch ? 'inline' : false,
  target: safari ? ['safari17'] : 'chrome120',
  logLevel: 'info',
  // __BUILD__ is shown under Settings, so it is clear which build Chrome has loaded.
  define: { 'process.env.NODE_ENV': watch ? '"development"' : '"production"', __BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC') },
}

const entries = [
  { entryPoints: ['src/ui/main.tsx'], outfile: `${outdir}/sidepanel.js`, format: 'esm' },
  // Safari: a classic service worker script (no "type": "module"), the most widely supported form.
  { entryPoints: ['src/background.ts'], outfile: `${outdir}/background.js`, format: safari ? 'iife' : 'esm' },
  // Injected with chrome.scripting.executeScript, so it must be one classic script.
  { entryPoints: ['src/page/content.ts'], outfile: `${outdir}/content.js`, format: 'iife' },
  // Declared content script on the website only (WEB_ORIGINS): the hand-off bridge (src/handoff.ts).
  { entryPoints: ['src/web/bridge.ts'], outfile: `${outdir}/bridge.js`, format: 'iife' },
]

/** Use the website mark for the browser toolbar and extension listing too. */
async function icon(size) {
  const logo = await readFile('web/public/favicon.svg', 'utf8')
  // Keep the website letter mark proportions with a small transparent margin.
  const inner = logo.replace(/<svg/, '<svg x="10" y="6" width="108" height="116"')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">${inner}</svg>`
  return new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
}

const pkg = JSON.parse(await readFile('package.json', 'utf8'))

/** Every official domain in plugins/*.json. The extension may read and inject only into these hosts. */
async function pluginDomains() {
  const domains = new Set()
  for (const file of (await readdir('plugins')).filter((name) => name.endsWith('.json')).sort()) {
    const plugin = JSON.parse(await readFile(`plugins/${file}`, 'utf8'))
    for (const domain of plugin.domains ?? []) domains.add(domain)
  }
  return [...domains].sort()
}

/** Public-administration domains the assistant may use without the person's approval (src/trust.ts). */
async function govDomains() {
  const source = await readFile('src/trust.ts', 'utf8')
  const list = /GOV_DOMAINS = \[([\s\S]*?)\]/.exec(source)?.[1] ?? ''
  return [...list.matchAll(/'([a-z0-9.-]+)'/g)].map((m) => m[1])
}

/**
 * The manifest. Host access comes from the site maps and the public-administration domains; any other site
 * is requested at run time, one site at a time, when the person approves it (optional_host_permissions).
 */
/** The website origins allowed to hand tasks to the extension (WEB_ORIGINS in src/handoff.ts). */
async function webOrigins() {
  const source = await readFile('src/handoff.ts', 'utf8')
  const list = /WEB_ORIGINS = \[([\s\S]*?)\]/.exec(source)?.[1] ?? ''
  return [...list.matchAll(/'(https?:\/\/[^']+)'/g)].map((m) => m[1])
}

async function manifest() {
  const domains = [...new Set([...(await pluginDomains()), ...(await govDomains())])].sort()
  const hosts = domains.flatMap((d) => [`https://${d}/*`, `https://*.${d}/*`])
  return {
    manifest_version: 3,
    name: 'OrientaT · Asistente de trámites',
    short_name: 'OrientaT',
    description: 'Te guía por las webs de la Administración: te lleva a la página correcta y te señala lo que tienes que rellenar y pulsar tú.',
    version: pkg.version,
    minimum_chrome_version: '120',
    action: { default_title: 'OrientaT', default_icon: { 16: 'icons/icon16.png', 32: 'icons/icon32.png' } },
    icons: { 16: 'icons/icon16.png', 32: 'icons/icon32.png', 48: 'icons/icon48.png', 128: 'icons/icon128.png' },
    side_panel: { default_path: 'sidepanel.html' },
    background: { service_worker: 'background.js', type: 'module' },
    permissions: ['sidePanel', 'storage', 'scripting', 'tabs'],
    // The local server in web/ (npm run dev) for the OpenAI provider (src/agent/localClient.ts), and the
    // website's own origins, so the background can put the bridge into its already-open tabs on install.
    host_permissions: [...new Set([...hosts, 'https://api.anthropic.com/*', 'http://127.0.0.1:5173/*', ...(await webOrigins()).map((o) => `${o}/*`)])],
    optional_host_permissions: ['https://*/*'],
    content_scripts: [{ matches: (await webOrigins()).map((o) => `${o}/*`), js: ['bridge.js'], run_at: 'document_start' }],
  }
}

/** Safari has no side panel: drop its key and permission (the background opens the UI in a window),
 *  Chrome-only keys, and build the service worker as a classic script. */
function safariManifest(manifest) {
  const out = { ...manifest }
  delete out.side_panel
  delete out.minimum_chrome_version
  out.permissions = (out.permissions ?? []).filter((p) => p !== 'sidePanel')
  out.background = { service_worker: out.background.service_worker }
  return out
}

await rm(outdir, { recursive: true, force: true })
await mkdir(`${outdir}/icons`, { recursive: true })
await cp('public', outdir, { recursive: true })
// The website's microphone capture worklet, shared with the side panel's voice (src/ui/voice.ts).
await cp('web/src/components/chat/voice-capture.js', `${outdir}/voice-capture.js`)
const built = await manifest()
await writeFile(`${outdir}/manifest.json`, JSON.stringify(safari ? safariManifest(built) : built, null, 2) + '\n')
for (const size of [16, 32, 48, 128]) await writeFile(`${outdir}/icons/icon${size}.png`, await icon(size))

if (watch) {
  for (const entry of entries) {
    const ctx = await context({ ...shared, ...entry })
    await ctx.watch()
  }
} else {
  await Promise.all(entries.map((entry) => build({ ...shared, ...entry })))
}
