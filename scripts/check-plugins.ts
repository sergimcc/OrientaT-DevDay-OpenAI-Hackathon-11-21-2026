// Checks every site map in plugins/*.json against the schema and the extra rules in checkPlugin,
// and that plugins/index.ts bundles each one. Exits non-zero on any problem. Usage: npm run check-plugins
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { RAW_PLUGINS } from '../plugins/index'
import { checkPlugin } from '../src/plugins/schema'

const dir = fileURLToPath(new URL('../plugins/', import.meta.url))
const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
const bundled = new Set(RAW_PLUGINS.map((p) => (p as { id?: unknown }).id))
let failed = 0

for (const file of files) {
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(join(dir, file), 'utf8'))
  } catch (err) {
    console.error(`✗ ${file}: invalid JSON (${(err as Error).message})`)
    failed++
    continue
  }
  const { plugin, problems } = checkPlugin(raw)
  if (plugin && plugin.id !== file.replace(/\.json$/, '')) problems.push({ plugin: plugin.id, message: `id does not match file name ${file}` })
  if (plugin && !bundled.has(plugin.id)) problems.push({ plugin: plugin.id, message: 'not listed in plugins/index.ts' })
  if (problems.length) {
    failed++
    console.error(`✗ ${file}`)
    for (const p of problems) console.error(`    ${p.message}`)
  } else {
    const steps = plugin!.procedures.reduce((n, proc) => n + proc.steps.length, 0)
    console.log(`✓ ${file} (${plugin!.status}, ${plugin!.procedures.length} procedures, ${steps} steps)`)
  }
}

console.log(`\n${files.length - failed}/${files.length} site maps OK`)
process.exit(failed ? 1 : 0)
