// What the assistant sees of a page, and the one thing it may do there: press a control that only moves
// around the site. Runs in the page's isolated world (content.ts) and under jsdom in the tests, so it
// touches nothing but the DOM.
//
// Privacy: the outline never carries what a person typed or chose (only "rellenado", "vacío",
// "marcado"…), and Spanish personal data in the page text (DNI/NIE/CIF, IBAN, NUSS, e-mail, mobile
// numbers) is replaced before anything leaves the page.

import { CLASS_TAG, REFUSAL, classify, fold } from '../policy'
import type { ControlClass, ControlInfo, PolicyContext } from '../policy'

export type Outline = {
  outline: string
  elements: number
  matched: boolean
  busy: boolean
  /** The class of every control in the outline, by ref, so the panel can check a click before asking for it. */
  classes: Record<string, ControlClass>
}
export type TableData = { columns: string[]; rows: string[][]; total_rows: number; offset: number; note?: string }
export type ClickResult = { ok: true; name: string } | { ok: false; error: string; refused?: ControlClass }

const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD', 'META', 'LINK', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO'])
const BLOCK = new Set([
  'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BODY', 'DD', 'DETAILS', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGURE',
  'FOOTER', 'FORM', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY', 'THEAD',
  'TFOOT', 'TR', 'UL', 'BR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LABEL',
])
const INTERACTIVE_ROLES = new Set([
  'button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch', 'tab', 'menuitem',
  'menuitemcheckbox', 'menuitemradio', 'option', 'spinbutton', 'slider', 'treeitem',
])
const TABLE_ROLES = new Set(['table', 'grid', 'treegrid'])
const CELL_SELECTOR = 'td, th, [role="cell"], [role="gridcell"], [role="columnheader"], [role="rowheader"]'
const ROW_SELECTOR = 'tr, [role="row"]'
const OUTLINE_TABLE_ROWS = 25
const NAME_CHARS = 90
const OUTLINE_CAP = 150_000
const FORM_TAGS = new Set(['INPUT', 'SELECT', 'TEXTAREA'])
const NESTED = 'a[href], button, input, select, textarea, [role="button"], [role="link"], table, p, li, h1, h2, h3, h4'

// ---------------------------------------------------------------------------------------------------
// Personal data in page text

const REDACTIONS: [RegExp, string][] = [
  // IBAN: Spanish first (ES + 22 digits, often in groups of four), then any country.
  [/\bES\d{2}(?:[\s-]?\d{4}){5}\b/gi, '[IBAN oculto]'],
  [/\b[A-Z]{2}\d{2}(?:[\s]?[A-Z0-9]{4}){3,7}(?:[\s]?[A-Z0-9]{1,3})?\b/g, '[IBAN oculto]'],
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email oculto]'],
  // NUSS / número de afiliación: 12 digits, sometimes written 28/12345678/90.
  [/\b\d{2}[\s/-]?\d{8}[\s/-]?\d{2}\b/g, '[NUSS oculto]'],
  [/\b[XYZ][\s-]?\d{7}[\s-]?[A-Z]\b/gi, '[NIE oculto]'],
  [/\b[ABCDEFGHJNPQRSUVW][\s-]?\d{7}[\s-]?[0-9A-J]\b/g, '[CIF oculto]'],
  [/\b\d{8}[\s-]?[A-Z]\b/gi, '[DNI oculto]'],
  // Personal mobile numbers (6xx, 7xx). Landlines and public help lines (8xx, 9xx, 060) stay readable.
  [/(?:(?:\+34|0034)[\s-]?)?\b[67]\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g, '[teléfono oculto]'],
]

/** Replaces Spanish personal identifiers, e-mails and mobile numbers in a piece of page text. */
export function redact(text: string): string {
  let out = text
  for (const [pattern, label] of REDACTIONS) out = out.replace(pattern, label)
  return out
}

// ---------------------------------------------------------------------------------------------------
// Refs

export class Registry {
  private refs = new Map<string, WeakRef<Element>>()
  private ids = new WeakMap<Element, string>()
  private next = 1
  /** Set per read so a ref says which frame owns it: `f3:e12`. */
  prefix = ''

  idFor(el: Element, kind: 'e' | 't'): string {
    const known = this.ids.get(el)
    if (known) return this.prefix + known
    const id = `${kind}${this.next}`
    this.next += 1
    this.ids.set(el, id)
    this.refs.set(id, new WeakRef(el))
    return this.prefix + id
  }

  get(ref: string): Element | null {
    const el = this.refs.get(ref.replace(/^\[|\]$/g, '').replace(/^f\d+:/, ''))?.deref()
    return el && el.isConnected ? el : null
  }
}

// ---------------------------------------------------------------------------------------------------
// Reading elements

function squash(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim()
}

/** Text as rendered: innerText skips hidden menus. jsdom has no innerText. */
function shownText(el: Element): string {
  const inner = (el as HTMLElement).innerText
  return squash(typeof inner === 'string' ? inner : el.textContent)
}

/** A label that sits beside the field instead of naming it (common in older JSP forms). */
function nearbyLabel(el: Element): string | null {
  let node: Element | null = el
  for (let depth = 0; node && depth < 4; depth++, node = node.parentElement) {
    const label = node.parentElement?.querySelector(':scope > label, :scope > * > label, :scope > [class*="label" i]')
    if (label && !label.contains(el) && !label.querySelector('input, select, textarea, button')) {
      const text = squash(label.textContent)
      if (text && text.length < 60) return text
    }
  }
  return null
}

/** Custom dropdowns drawn as focusable divs. */
function isCustomSelect(el: Element): boolean {
  const tab = el.getAttribute('tabindex')
  return tab !== null && Number(tab) >= 0 && /select|dropdown|combo/i.test(el.getAttribute('class') ?? '') && !el.querySelector('input, select, textarea, button, a[href]')
}

function clip(text: string, max = NAME_CHARS): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function role(el: Element): string {
  return (el.getAttribute('role') ?? '').trim().toLowerCase()
}

function isHidden(el: Element): boolean {
  if (el.hasAttribute('hidden')) return true
  if (el instanceof HTMLInputElement && el.type === 'hidden') return true
  const style = el.ownerDocument.defaultView?.getComputedStyle(el)
  return !!style && (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse')
}

function isInteractive(el: Element): boolean {
  const tag = el.tagName
  if (tag === 'A') return el.hasAttribute('href')
  if (tag === 'BUTTON' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'SUMMARY') return true
  if (tag === 'INPUT') return (el as HTMLInputElement).type !== 'hidden'
  if (INTERACTIVE_ROLES.has(role(el))) return true
  if (isCustomSelect(el)) return true
  return el.getAttribute('contenteditable') === 'true'
}

function isTable(el: Element): boolean {
  if (TABLE_ROLES.has(role(el))) return true
  if (el.tagName !== 'TABLE' || role(el) === 'presentation' || role(el) === 'none') return false
  // A table holding other tables and no header cells is page layout, not data.
  return !(el.querySelector('table') && !el.querySelector('th'))
}

export function kind(el: Element): string {
  const r = role(el)
  if (r && r !== 'none' && r !== 'presentation') return r
  if (isCustomSelect(el)) return 'combobox'
  const tag = el.tagName
  if (tag === 'A') return 'link'
  if (tag === 'BUTTON' || tag === 'SUMMARY') return 'button'
  if (tag === 'SELECT') return 'select'
  if (tag === 'TEXTAREA') return 'textbox'
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type
    if (type === 'checkbox' || type === 'radio') return type
    if (type === 'submit' || type === 'button' || type === 'reset' || type === 'image') return 'button'
    if (type === 'file') return 'file input'
    return type === 'text' ? 'textbox' : `${type} input`
  }
  return 'textbox'
}

function labelledBy(el: Element): string {
  const ids = (el.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean)
  return squash(ids.map((id) => el.ownerDocument.getElementById(id)?.textContent ?? '').join(' '))
}

// Icon-only controls carry their meaning only in an icon's class.
const ICON_HINTS: [RegExp, string][] = [
  [/chevron-right|arrow-right|caret-right|\bnext\b/i, 'Siguiente'],
  [/chevron-left|arrow-left|caret-left|\bprev(ious)?\b/i, 'Anterior'],
  [/search|magnif|lupa/i, 'Buscar'],
  [/download|descarg/i, 'Descargar'],
  [/\bclose\b|cerrar|x-lg/i, 'Cerrar'],
  [/hamburger|\bmenu\b|bars/i, 'Menú'],
]

function iconHint(el: Element): string | null {
  const icon = el.querySelector('i, svg, [class*="icon" i]')
  for (const classes of [icon?.getAttribute('class') ?? '', el.getAttribute('class') ?? '']) {
    const hit = classes.trim() ? ICON_HINTS.find(([pattern]) => pattern.test(classes)) : undefined
    if (hit) return `${hit[1]} (icono)`
  }
  return null
}

export function accessibleName(el: Element, useText = true): string {
  // A submit input's value is its caption, not something the person typed. It must win over the label of
  // the field next to it (nearbyLabel), or «Enviar datos» would be read as «Código de Seguridad».
  const caption = el instanceof HTMLInputElement && ['submit', 'button', 'reset'].includes(el.type) ? el.value : null
  const candidates = [
    el.getAttribute('aria-label'),
    labelledBy(el),
    caption,
    el.id ? Array.from(el.ownerDocument.querySelectorAll('label')).find((label) => label.htmlFor === el.id)?.textContent : null,
    FORM_TAGS.has(el.tagName) ? el.closest('label')?.textContent : null,
    FORM_TAGS.has(el.tagName) || isCustomSelect(el) ? nearbyLabel(el) : null,
    el.getAttribute('placeholder'),
    el.getAttribute('title'),
    el.getAttribute('alt'),
    FORM_TAGS.has(el.tagName) || isCustomSelect(el) || el.getAttribute('contenteditable') === 'true' || !useText ? null : el.textContent,
    el.getAttribute('name'),
    isInteractive(el) ? iconHint(el) : null,
  ]
  for (const candidate of candidates) {
    const text = squash(candidate)
    if (text) return clip(redact(text))
  }
  return ''
}

/** Whether a field holds something, never what it holds. */
function fieldState(el: Element): string | null {
  if (el instanceof HTMLInputElement) {
    if (el.type === 'checkbox' || el.type === 'radio') return el.checked ? 'marcado' : 'sin marcar'
    if (['submit', 'button', 'reset', 'image'].includes(el.type)) return null
    if (el.type === 'file') return el.files && el.files.length ? 'con archivo' : 'sin archivo'
    return el.value ? 'rellenado' : 'vacío'
  }
  if (el instanceof HTMLTextAreaElement) return el.value ? 'rellenado' : 'vacío'
  if (el instanceof HTMLSelectElement) return el.value ? 'elegido' : 'sin elegir'
  const checked = el.getAttribute('aria-checked')
  if (checked === 'true' || checked === 'false') return checked === 'true' ? 'marcado' : 'sin marcar'
  if (el.getAttribute('contenteditable') === 'true') return squash(el.textContent) ? 'rellenado' : 'vacío'
  if (isCustomSelect(el)) return squash(el.textContent) ? 'elegido' : 'sin elegir'
  return null
}

/** What the policy needs to know about a control, read from the DOM. */
export function controlInfo(el: Element): ControlInfo {
  const k = kind(el)
  let href: string | null | undefined
  if (el instanceof HTMLAnchorElement) {
    const raw = (el.getAttribute('href') ?? '').trim()
    href = !raw || raw.startsWith('#') ? null : el.href
  }
  let buttonType: string | null = null
  if (el instanceof HTMLButtonElement) buttonType = el.getAttribute('type') ?? (el.form ? 'submit' : 'button')
  else if (el instanceof HTMLInputElement && ['submit', 'image', 'reset', 'button'].includes(el.type)) buttonType = el.type
  return {
    kind: k,
    name: accessibleName(el),
    href,
    buttonType,
    inForm: !!el.closest('form'),
    toggles: el.tagName === 'SUMMARY' || el.hasAttribute('aria-expanded') || el.hasAttribute('aria-controls') || role(el) === 'tab',
    disabled: (el as HTMLButtonElement).disabled === true || el.getAttribute('aria-disabled') === 'true',
  }
}

/** Where a link leads: a path on this site, a full url elsewhere. */
function linkAddress(el: Element): string | null {
  if (!(el instanceof HTMLAnchorElement)) return null
  const raw = el.getAttribute('href') ?? ''
  if (!raw || raw.startsWith('#') || /^(javascript|mailto|tel):/i.test(raw)) return null
  try {
    const url = new URL(el.href)
    const here = url.origin === el.ownerDocument.location.origin
    return clip(redact(here ? url.pathname + url.search : url.href), 160)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------------------------------
// The outline

class Writer {
  lines: string[] = []
  elements = 0
  classes: Record<string, ControlClass> = {}
  private buf: string[] = []
  /** Inside a table row: block elements in a cell do not break the row's line. */
  row = false

  push(text: string): void {
    if (text) this.buf.push(text)
  }

  flush(prefix = '', endRow = false): void {
    if (this.row && !endRow) return
    const line = squash(this.buf.join(' '))
    this.buf = []
    if (line) this.lines.push(prefix + line)
  }
}

type Walk = { out: Writer; registry: Registry; ctx: PolicyContext }

function token(el: Element, w: Walk, useText = true): string {
  const info = controlInfo(el)
  const name = accessibleName(el, useText)
  const cls = classify(info, w.ctx)
  const ref = w.registry.idFor(el, 'e')
  w.out.classes[ref] = cls
  const flags: string[] = []
  const state = fieldState(el)
  if (state) flags.push(state)
  if (info.disabled) flags.push('desactivado')
  if ((el as HTMLInputElement).required || el.getAttribute('aria-required') === 'true') flags.push('obligatorio')
  if (el.getAttribute('aria-expanded') === 'true') flags.push('abierto')
  if (el.getAttribute('aria-invalid') === 'true') flags.push('con error')
  let text = `[${ref}] ${info.kind}`
  if (name) text += ` "${name}"`
  if (flags.length) text += ` (${flags.join(', ')})`
  const address = linkAddress(el)
  if (address) text += ` → ${address}`
  return `${text} {${CLASS_TAG[cls]}}`
}

function tableRows(table: Element): Element[] {
  return Array.from(table.querySelectorAll(ROW_SELECTOR)).filter((row) => closestTable(row) === table)
}

function closestTable(el: Element): Element | null {
  for (let node = el.parentElement; node; node = node.parentElement) if (isTable(node)) return node
  return null
}

function rowCells(row: Element): Element[] {
  return Array.from(row.querySelectorAll(CELL_SELECTOR)).filter((cell) => cell.closest(ROW_SELECTOR) === row)
}

function walkChildren(parent: Node, w: Walk): void {
  for (const child of Array.from(parent.childNodes)) {
    if (child.nodeType === 3) w.out.push(redact(squash(child.textContent)))
    else if (child.nodeType === 1) walk(child as Element, w)
  }
}

function walkTable(table: Element, w: Walk): void {
  const { out, registry } = w
  const rows = tableRows(table)
  const captionEl = table.querySelector('caption')
  const name = accessibleName(captionEl ?? table)
  const caption = captionEl || table.getAttribute('aria-label') || labelledBy(table) ? ` "${name}"` : ''
  const outer = out.row
  out.row = false
  out.flush()
  out.lines.push(`[${registry.idFor(table, 't')}] table${caption} (${rows.length} filas)`)
  for (const row of rows.slice(0, OUTLINE_TABLE_ROWS)) {
    if (isHidden(row)) continue
    out.row = true
    rowCells(row).forEach((cell, index) => {
      if (index) out.push('|')
      walkChildren(cell, w)
    })
    out.flush('  ', true)
    out.row = false
  }
  if (rows.length > OUTLINE_TABLE_ROWS) out.lines.push(`  … ${rows.length - OUTLINE_TABLE_ROWS} filas más`)
  out.row = outer
}

function walk(el: Element, w: Walk): void {
  const { out } = w
  if (SKIP.has(el.tagName.toUpperCase()) || isHidden(el)) return
  // Each frame is read by its own copy of the page script, never through its parent.
  if (el.tagName === 'IFRAME' || el.tagName === 'FRAME') return
  if (el.tagName === 'IMG') {
    const alt = squash(el.getAttribute('alt'))
    if (alt) out.push(`(imagen: ${clip(redact(alt))})`)
    return
  }
  if (isTable(el)) {
    walkTable(el, w)
    return
  }
  if (isInteractive(el)) {
    out.elements += 1
    // A card that is itself a link holds more than a name: keep its contents readable.
    const holdsContent = !FORM_TAGS.has(el.tagName) && el.getAttribute('contenteditable') !== 'true' && (squash(el.textContent).length > NAME_CHARS || !!el.querySelector(NESTED))
    out.push(token(el, w, !holdsContent))
    if (holdsContent) {
      out.push(':')
      walkChildren(el, w)
    }
    return
  }
  const heading = /^H([1-6])$/.exec(el.tagName)
  if (heading || role(el) === 'heading') {
    const level = Number(heading?.[1] ?? el.getAttribute('aria-level') ?? 2)
    out.flush()
    out.push(redact(squash(el.textContent)))
    out.flush(`${'#'.repeat(Math.min(Math.max(level, 1), 6))} `)
    return
  }
  const block = BLOCK.has(el.tagName)
  if (block) out.flush()
  walkChildren(el, w)
  if (el.shadowRoot) walkChildren(el.shadowRoot, w)
  if (block) out.flush()
}

/** A spinner or progress bar is on screen: the page is still fetching what it will show. */
function isBusy(doc: Document): boolean {
  for (const el of Array.from(doc.querySelectorAll('[aria-busy="true"], [role="progressbar"], [class*="spinner" i], [class*="loading" i], [class*="cargando" i]')).slice(0, 20)) {
    const box = (el as HTMLElement).getBoundingClientRect?.()
    if (box && box.width > 0 && box.height > 0 && !isHidden(el)) return true
  }
  return false
}

export function readOutline(doc: Document, registry: Registry, ctx: PolicyContext, opts: { query?: string } = {}): Outline {
  const out = new Writer()
  if (doc.body) walk(doc.body, { out, registry, ctx })
  out.flush()
  let lines = out.lines
  const query = opts.query?.trim() ? fold(opts.query) : ''
  if (query) {
    const keep = new Set<number>()
    lines.forEach((line, index) => {
      if (!fold(line).includes(query)) return
      for (const near of [index - 1, index, index + 1]) keep.add(near)
    })
    lines = lines.filter((_, index) => keep.has(index))
  }
  return { outline: lines.join('\n').slice(0, OUTLINE_CAP), elements: out.elements, matched: lines.length > 0, busy: isBusy(doc), classes: out.classes }
}

export function readTable(registry: Registry, ref: string, opts: { offset?: number; max_rows?: number } = {}): TableData | { error: string } {
  const table = registry.get(ref)
  if (!table || !isTable(table)) return { error: `No hay ninguna tabla ${ref} en la página. Vuelve a leer la página.` }
  const rows = tableRows(table)
  const headerRow = rows.find((row) => row.querySelector('th, [role="columnheader"]'))
  const columns = headerRow ? rowCells(headerRow).map((cell) => redact(shownText(cell))) : []
  const body = rows.filter((row) => row !== headerRow)
  const offset = Math.max(opts.offset ?? 0, 0)
  const count = Math.min(Math.max(opts.max_rows ?? 100, 1), 500)
  return {
    columns,
    rows: body.slice(offset, offset + count).map((row) => rowCells(row).map((cell) => redact(shownText(cell)))),
    total_rows: body.length,
    offset,
  }
}

// ---------------------------------------------------------------------------------------------------
// The one action: a click that only moves around the site

function click(el: Element): void {
  const node = el as HTMLElement
  node.scrollIntoView?.({ block: 'center' })
  const view = el.ownerDocument.defaultView
  const Pointer = view?.PointerEvent ?? view?.MouseEvent
  const Mouse = view?.MouseEvent
  if (Pointer && Mouse) {
    const rect = el.getBoundingClientRect?.()
    const init = { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1, clientX: rect ? rect.left + rect.width / 2 : 0, clientY: rect ? rect.top + rect.height / 2 : 0 }
    el.dispatchEvent(new Pointer('pointerdown', init))
    el.dispatchEvent(new Mouse('mousedown', init))
    el.dispatchEvent(new Pointer('pointerup', init))
    el.dispatchEvent(new Mouse('mouseup', init))
  }
  node.click()
}

/**
 * Presses `ref` only if, classified again here and now, it is a control that moves around the site.
 * The panel checked the same thing from the last read; this check runs on the live element, so a page
 * that changed since cannot turn a link into a submit button under the assistant's finger.
 */
export function guidedClick(registry: Registry, ref: string, ctx: PolicyContext): ClickResult {
  const el = registry.get(ref)
  if (!el) return { ok: false, error: `El elemento ${ref} ya no está en la página. Vuelve a leer la página.` }
  const info = controlInfo(el)
  const cls = classify(info, ctx)
  if (cls !== 'nav') return { ok: false, refused: cls, error: REFUSAL[cls] }
  if (info.disabled) return { ok: false, error: 'El control está desactivado.' }
  click(el)
  return { ok: true, name: info.name }
}
