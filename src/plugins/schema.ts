import { z } from 'zod'

// A site map ("plugin") describes one official website: which hosts belong to it, how people sign in,
// and the procedures (trámites) people come to do, step by step, with the controls that only the person
// may press. The assistant reads it before it moves; the extension enforces the parts that matter
// (hosts, controls) in code. Maps live in plugins/*.json. See docs/plugins.md.

export const LOGIN_METHODS = ['clave', 'clave_pin', 'clave_permanente', 'certificado', 'dnie', 'referencia', 'sms', 'sin_identificacion', 'datos_documento'] as const
// `datos_documento`: the person types data printed on their own ID card (cita previa DNI), no account or PIN.

const kebab = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case')
const httpsUrl = z.url({ protocol: /^https$/ })
const hostname = z.string().regex(/^([a-z0-9-]+\.)+[a-z]{2,}$/, 'a bare hostname like sede.example.gob.es')

/** One field of a panel form: what the person sees, and the input on the page it is copied into. */
export const FormFieldSchema = z.object({
  id: kebab,
  label: z.string().min(1),
  /** The `id` attribute of the text input on the official page. */
  target: z.string().regex(/^[A-Za-z][\w-]*$/, 'a DOM id'),
  hint: z.string().optional(),
  placeholder: z.string().optional(),
  max_length: z.number().int().min(1).max(100),
  /** A regular expression the whole value must match, checked in the panel and again in the page. */
  pattern: z.string().refine((source) => { try { new RegExp(source); return true } catch { return false } }, 'a regular expression').optional(),
  /** Letters are copied in upper case. */
  uppercase: z.boolean().optional(),
  numeric: z.boolean().optional(),
  /** The person may leave it empty; the page field is then left as it is. */
  optional: z.boolean().optional(),
})

/**
 * A form shown in the panel for one step. The person types there, and the extension copies each value
 * into its `target` on the page. The values never reach the assistant (src/page/form.ts).
 */
export const FormSchema = z.object({
  id: kebab,
  title: z.string().min(1),
  intro: z.string().optional(),
  fields: z.array(FormFieldSchema).min(1).max(12),
})

export const StepSchema = z.object({
  title: z.string().min(1),
  /** Where this step happens, when it has a stable address. */
  url: httpsUrl.optional(),
  /** For the assistant: how to get through this step. */
  guidance: z.string().min(1),
  /** For the person: what they must do themselves here (fill, choose, sign, press). */
  person_does: z.string().optional(),
  /** Names of controls on this step that only the person presses, beyond the global rules. */
  user_only: z.array(z.string()).optional(),
  /** A panel form that fills this step's fields for the person. */
  form: FormSchema.optional(),
})

export const ProcedureSchema = z.object({
  id: kebab,
  title: z.string().min(1),
  summary: z.string().min(1),
  /** Words people use for it ("vida laboral", "informe de cotizaciones"). */
  keywords: z.array(z.string()).min(1),
  entry_url: httpsUrl,
  login: z.array(z.enum(LOGIN_METHODS)).min(1),
  steps: z.array(StepSchema).min(1),
  /** What the person should have at hand. */
  you_need: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
})

export const SitePluginSchema = z.object({
  id: kebab,
  name: z.string().min(1),
  authority: z.string().min(1),
  level: z.enum(['estatal', 'autonomica', 'local']),
  /** `verified`: checked by a person against the live site. `draft`: generated, not yet checked. */
  status: z.enum(['verified', 'draft']),
  /** Hosts that belong to the site; each also covers its subdomains. */
  domains: z.array(hostname).min(1),
  home: httpsUrl,
  /** Site-wide notes for the assistant (sign-in quirks, pop-ups, opening hours of a service). */
  notes: z.array(z.string()).optional(),
  /** Names of controls that only the person presses anywhere on this site. */
  user_only: z.array(z.string()).optional(),
  procedures: z.array(ProcedureSchema).min(1),
  /** ISO date the map was last checked against the site. */
  checked: z.iso.date(),
})

export type FormField = z.infer<typeof FormFieldSchema>
export type PanelForm = z.infer<typeof FormSchema>
export type Step = z.infer<typeof StepSchema>
export type Procedure = z.infer<typeof ProcedureSchema>
export type SitePlugin = z.infer<typeof SitePluginSchema>

export type PluginProblem = { plugin: string; message: string }

/** Schema errors, plus the rules the schema cannot say: unique ids, and every url on the site's own hosts. */
export function checkPlugin(raw: unknown): { plugin: SitePlugin | null; problems: PluginProblem[] } {
  const parsed = SitePluginSchema.safeParse(raw)
  const name = typeof raw === 'object' && raw && 'id' in raw ? String((raw as { id: unknown }).id) : '(unknown)'
  if (!parsed.success) {
    return { plugin: null, problems: parsed.error.issues.map((issue) => ({ plugin: name, message: `${issue.path.join('.')}: ${issue.message}` })) }
  }
  const plugin = parsed.data
  const problems: PluginProblem[] = []
  const onSite = (url: string) => {
    const host = new URL(url).hostname
    return plugin.domains.some((d) => host === d || host.endsWith(`.${d}`))
  }
  const urls: [string, string][] = [['home', plugin.home]]
  const ids = new Set<string>()
  const formIds = new Set<string>()
  for (const proc of plugin.procedures) {
    for (const step of proc.steps) {
      if (!step.form) continue
      if (formIds.has(step.form.id)) problems.push({ plugin: plugin.id, message: `duplicate form id ${step.form.id}` })
      formIds.add(step.form.id)
      for (const key of ['id', 'target'] as const) {
        const seen = step.form.fields.map((field) => field[key])
        if (new Set(seen).size !== seen.length) problems.push({ plugin: plugin.id, message: `form ${step.form.id} repeats a field ${key}` })
      }
    }
    if (ids.has(proc.id)) problems.push({ plugin: plugin.id, message: `duplicate procedure id ${proc.id}` })
    ids.add(proc.id)
    urls.push([`${proc.id}.entry_url`, proc.entry_url])
    proc.steps.forEach((step, i) => step.url && urls.push([`${proc.id}.steps.${i}.url`, step.url]))
  }
  for (const [where, url] of urls) {
    if (!onSite(url)) problems.push({ plugin: plugin.id, message: `${where} is not on the site's domains: ${url}` })
  }
  return { plugin, problems }
}
