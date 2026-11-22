// What the person types into a sensitive field (DNI, NIE, teléfono, correo, IBAN…) is shown half covered
// on screen, «1234*****», so it does not appear in a screen share or a recording. The field keeps its
// real value: its text is made transparent and the covered copy is drawn on top, in a closed shadow root
// outside <body> (like the cursor), so the form sends what the person typed, the outline never reads the
// copy, and the copy never takes a click. The value is read here, in the page, to draw the copy; it never
// leaves the page (the outline only says «rellenado» or «vacío»).

import { accessibleName } from './dom'

const HOST_ID = 'asistente-tramites-mask'
const REFRESH_MS = 400

/** Words in a field's label, name or id that mark it as personal data. */
const SENSITIVE_NAME = /\b(?:dni|nie|nif|cif|documento|doc|soporte|pasaporte|identidad|identificaci[oó]n|tel[eé]fono|tlf|tfno|m[oó]vil|movil|phone|tel|e-?mail|correo|mail|iban|cuenta|ccc|seguridad social|nuss|naf|afiliaci[oó]n|tarjeta|equipo|expedici[oó]n|validez|caducidad|seguridad|captcha|caracteres)\b|(?:dni|nie|nif|telef|movil|email|correo|iban|nuss|pasaport)/i
/** Values that are personal data whatever the field is called (the shapes `redact` hides in dom.ts). */
const SENSITIVE_VALUE = [
  /^\s*\d{8}[\s-]?[A-Z]\s*$/i, // DNI
  /^\s*[XYZ][\s-]?\d{7}[\s-]?[A-Z]\s*$/i, // NIE
  /^\s*[\w.+-]+@[\w-]+(?:\.[\w-]+)+\s*$/, // e-mail
  /^\s*(?:(?:\+34|0034)[\s-]?)?[6789]\d{2}[\s-]?\d{3}[\s-]?\d{3}\s*$/, // teléfono
  /^\s*[A-Z]{2}\d{2}(?:[\s-]?[A-Z0-9]{4}){3,7}/i, // IBAN
  /^\s*\d{2}[\s/-]?\d{8}[\s/-]?\d{2}\s*$/, // NUSS
]
const TEXT_TYPES = new Set(['', 'text', 'tel', 'email', 'number', 'search'])

/** Keeps the first half of a value and covers it from the middle to the end: «12345678Z» → «1234*****». */
export function halfMask(value: string): string {
  const at = value.indexOf('@')
  if (at > 0) return halfMask(value.slice(0, at)) + value.slice(at)
  const chars = [...value]
  const visible = chars.filter((c) => !/\s/.test(c)).length
  if (visible <= 2) return chars.map((c) => (/\s/.test(c) ? c : '*')).join('')
  const keep = Math.floor(visible / 2)
  let seen = 0
  return chars
    .map((c) => {
      if (/\s/.test(c)) return c
      return seen++ < keep ? c : '*'
    })
    .join('')
}

/** Whether a field holds personal data: by its name or label, or by what it holds. */
export function isSensitiveField(el: Element): el is HTMLInputElement {
  // By tag, not instanceof: an iframe's inputs come from another window's HTMLInputElement.
  if (el.tagName !== 'INPUT' || !TEXT_TYPES.has((el as HTMLInputElement).type)) return false
  const input = el as HTMLInputElement
  // Ids and names are often camelCase («codEquipo», «fechaValidez»): split them into words.
  const names = [accessibleName(input), input.name, input.id, input.autocomplete].join(' ').replace(/([a-z])([A-Z])/g, '$1 $2')
  return SENSITIVE_NAME.test(names) || SENSITIVE_VALUE.some((shape) => shape.test(input.value))
}

type Masked = { el: HTMLInputElement; copy: HTMLElement; color: string }
type State = { host: HTMLElement; layer: HTMLElement; fields: Map<HTMLInputElement, Masked>; frame: number }

const STYLE = `
:host { all: initial; }
.layer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483640; }
.copy { position: fixed; display: flex; align-items: center; overflow: hidden; white-space: pre; box-sizing: border-box; }
`

function cover(state: State, el: HTMLInputElement): Masked {
  const known = state.fields.get(el)
  if (known) return known
  const copy = el.ownerDocument.createElement('div')
  copy.className = 'copy'
  state.layer.append(copy)
  const masked = { el, copy, color: el.ownerDocument.defaultView!.getComputedStyle(el).color }
  state.fields.set(el, masked)
  return masked
}

function release(state: State, masked: Masked): void {
  masked.copy.remove()
  masked.el.style.removeProperty('color')
  masked.el.style.removeProperty('-webkit-text-fill-color')
  masked.el.style.removeProperty('caret-color')
  state.fields.delete(masked.el)
}

/** Draws the covered copy over the field, matching its box and font, or hides it when it cannot. */
function place(masked: Masked): void {
  const { el, copy } = masked
  const view = el.ownerDocument.defaultView!
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  // Hidden, scrolled away, or under something else (a dialog, a menu): no copy, and the field as it is.
  const hit = rect.width && rect.height ? el.ownerDocument.elementFromPoint?.(cx, cy) : null
  const shown = !!el.value && el.isConnected && !!hit && (hit === el || el.contains(hit))
  if (!shown) {
    copy.style.display = 'none'
    el.style.removeProperty('color')
    el.style.removeProperty('-webkit-text-fill-color')
    return
  }
  const css = view.getComputedStyle(el)
  copy.textContent = halfMask(el.value)
  Object.assign(copy.style, {
    display: 'flex',
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    paddingLeft: `${parseFloat(css.paddingLeft) + parseFloat(css.borderLeftWidth)}px`,
    paddingRight: `${parseFloat(css.paddingRight) + parseFloat(css.borderRightWidth)}px`,
    justifyContent: css.textAlign === 'center' ? 'center' : css.textAlign === 'right' || css.textAlign === 'end' ? 'flex-end' : 'flex-start',
    font: css.font,
    letterSpacing: css.letterSpacing,
    color: masked.color,
  })
  el.style.setProperty('color', 'transparent', 'important')
  el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important')
  el.style.setProperty('caret-color', masked.color, 'important')
}

function refresh(state: State, doc: Document): void {
  for (const el of doc.querySelectorAll('input')) if (isSensitiveField(el)) cover(state, el)
  for (const masked of [...state.fields.values()]) {
    if (!masked.el.isConnected) release(state, masked)
    else place(masked)
  }
  if (!state.host.isConnected || doc.documentElement.lastElementChild !== state.host) doc.documentElement.append(state.host)
}

/** Starts covering the sensitive fields of this document. Safe to call more than once. Never throws. */
export function startMasking(doc: Document = document): void {
  const holder = doc as Document & { __asistenteMask?: State }
  if (holder.__asistenteMask) return
  try {
    const host = doc.createElement('div')
    host.id = HOST_ID
    const root = host.attachShadow({ mode: 'closed' })
    const style = doc.createElement('style')
    style.textContent = STYLE
    const layer = doc.createElement('div')
    layer.className = 'layer'
    root.append(style, layer)
    const state: State = { host, layer, fields: new Map(), frame: 0 }
    holder.__asistenteMask = state
    const view = doc.defaultView ?? window
    const soon = () => {
      view.cancelAnimationFrame?.(state.frame)
      state.frame = view.requestAnimationFrame?.(() => refresh(state, doc)) ?? 0
    }
    // Typing, scrolling, resizing and focus move or change the copy at once; the timer catches the rest
    // (fields added later, layout that shifts without an event).
    doc.addEventListener('input', soon, true)
    doc.addEventListener('focusin', soon, true)
    view.addEventListener('scroll', soon, true)
    view.addEventListener('resize', soon)
    view.setInterval(() => refresh(state, doc), REFRESH_MS)
    refresh(state, doc)
  } catch {
    // Covering is a courtesy for screen sharing: a page that refuses it must keep working.
  }
}
