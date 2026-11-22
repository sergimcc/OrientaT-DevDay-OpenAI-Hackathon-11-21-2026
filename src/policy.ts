// What the assistant may press on a page, decided in one place and enforced twice: in the page script
// before any click, and in the panel before it asks the page to click. The model is told the class of
// every control, but it is never trusted to respect it.
//
// The rule: the assistant only moves the person around. It may follow links, open menus, tabs and
// accordions. It never types, never ticks, never chooses, and never presses anything that sends, signs,
// pays or saves. Those it can only point at, and the person does them.

export type ControlClass =
  /** Moves around the site: links, tabs, menus, accordions. The assistant may press it. */
  | 'nav'
  /** A field to fill, tick or choose. Only the person does it. */
  | 'field'
  /** Sends, signs, pays, saves, deletes, or anything inside a form. Only the person does it. */
  | 'action'
  /** Leads off the official sites this extension knows. The assistant may not follow it. */
  | 'external'

/** What the page script knows about a control, without its value. */
export type ControlInfo = {
  /** link, button, textbox, checkbox, combobox, tab, menuitem, … */
  kind: string
  /** Its visible name or label. */
  name: string
  /** For links: the absolute href, or null for `#`, `javascript:` and the like. */
  href?: string | null
  /** For buttons: the `type` attribute (`submit` is the default inside a form). */
  buttonType?: string | null
  /** Sits inside a `<form>`. */
  inForm?: boolean
  /** Opens or closes something on the page (aria-expanded / aria-controls / <summary>). */
  toggles?: boolean
  disabled?: boolean
}

export type PolicyContext = {
  /** Hostnames the extension knows as official; their subdomains count too. */
  officialHosts: string[]
  /** Extra names the site's map says only the person presses (matched case- and accent-insensitively). */
  userOnly?: string[]
}

const FIELD_KINDS = new Set([
  'textbox', 'searchbox', 'select', 'combobox', 'listbox', 'option', 'checkbox', 'radio', 'switch',
  'slider', 'spinbutton', 'file input', 'password input', 'email input', 'number input', 'tel input',
  'date input', 'url input', 'search input', 'month input', 'week input', 'time input',
  'datetime-local input', 'range input', 'color input', 'menuitemcheckbox', 'menuitemradio',
])

const NAV_KINDS = new Set(['link', 'tab', 'menuitem', 'treeitem'])

/**
 * Words on a control that make it an action whatever it looks like. Spanish first, with the co-official
 * languages' most common forms (sedes in Catalonia, the Basque Country and Galicia use them), and English.
 */
const ACTION_WORDS = [
  // sending and submitting
  'enviar', 'envio', 'presentar', 'presentacion', 'tramitar', 'registrar', 'solicitar', 'confirmar',
  'aceptar', 'continuar con el pago', 'finalizar', 'validar', 'grabar', 'guardar', 'firmar', 'firma',
  'pagar', 'pago', 'abonar', 'domiciliar', 'aplazar', 'fraccionar', 'reservar', 'anular', 'cancelar cita',
  'borrar', 'eliminar', 'suprimir', 'renunciar', 'desistir', 'darse de baja', 'dar de baja', 'dar de alta',
  'modificar', 'rectificar', 'adjuntar', 'subir', 'aportar', 'autorizar', 'otorgar', 'revocar', 'apoderar',
  'iniciar sesion', 'identificarse', 'acceder con', 'entrar con', 'descargar', 'imprimir', 'emitir',
  'obtener certificado', 'expedir', 'generar', 'cerrar sesion', 'desconectar',
  // co-official languages
  'enviament', 'presentar', 'signar', 'pagament', 'tramitar', 'sol·licitar', 'desar', 'esborrar',
  'bidali', 'aurkeztu', 'sinatu', 'ordaindu', 'gorde', 'ezabatu',
  'asinar', 'pagamento', 'gardar', 'borrar',
  // English
  'submit', 'send', 'sign', 'pay', 'save', 'delete', 'remove', 'confirm', 'accept', 'book', 'register',
  'apply', 'upload', 'download', 'print', 'log in', 'login', 'sign in', 'log out', 'logout',
]

/** Lower case, no accents, single spaces: "Presentación" and "presentacion" are the same word. */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Whole words or phrases only: "Pago" matches "Pago de tasas", "pagos" does not match "pago". */
function containsWord(name: string, words: string[]): boolean {
  const clean = (text: string) => fold(text).replace(/[^\p{L}\p{N}·@]+/gu, ' ').trim()
  const text = ` ${clean(name)} `
  return words.some((word) => {
    const w = clean(word)
    return w !== '' && text.includes(` ${w} `)
  })
}

export function isOfficialHost(host: string, officialHosts: string[]): boolean {
  const h = host.toLowerCase().replace(/\.$/, '')
  return officialHosts.some((domain) => {
    const d = domain.toLowerCase()
    return h === d || h.endsWith(`.${d}`)
  })
}

export function isOfficialUrl(url: string, officialHosts: string[]): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && isOfficialHost(parsed.hostname, officialHosts)
  } catch {
    return false
  }
}

export function classify(control: ControlInfo, ctx: PolicyContext): ControlClass {
  const kind = control.kind.toLowerCase()
  if (FIELD_KINDS.has(kind) || kind.endsWith(' input')) return 'field'
  if (control.name && containsWord(control.name, [...ACTION_WORDS, ...(ctx.userOnly ?? [])])) return 'action'
  if (kind === 'link') {
    if (!control.href) return control.inForm ? 'action' : control.toggles ? 'nav' : 'action'
    if (/^(javascript|data|blob|mailto|tel):/i.test(control.href)) return 'action'
    return isOfficialUrl(control.href, ctx.officialHosts) ? 'nav' : 'external'
  }
  if (NAV_KINDS.has(kind)) return control.inForm ? 'action' : 'nav'
  if (kind === 'button') {
    const type = (control.buttonType ?? '').toLowerCase()
    if (type === 'submit' || type === 'image' || type === 'reset') return 'action'
    // Inside a form a button with no type submits it; with type="button" it still runs the form's code.
    if (control.inForm) return 'action'
    return control.toggles ? 'nav' : 'action'
  }
  return 'action'
}

/** The words the panel and the model see for each class. */
export const CLASS_TAG: Record<ControlClass, string> = {
  nav: 'nav',
  field: 'campo: lo rellena la persona',
  action: 'acción: la pulsa la persona',
  external: 'fuera de las webs de confianza',
}

export const REFUSAL: Record<Exclude<ControlClass, 'nav'>, string> = {
  field:
    'Es un campo del formulario. El asistente nunca escribe, marca ni elige nada: señálaselo a la persona con point_to y explícale qué poner.',
  action:
    'Es un botón que envía, firma, paga, guarda o actúa dentro de un formulario. Solo lo pulsa la persona: señálaselo con point_to y dile qué va a pasar cuando lo pulse.',
  external:
    'El enlace lleva fuera de las webs de confianza de la extensión. No lo pulses. Si es la web oficial que buscáis, ábrela con open_page explicando por qué (la persona tendrá que aprobarla); si no, explícale a la persona adónde lleva.',
}
