// Panel forms. A site map can declare, for one step, a short form shown in the panel (plugins/*.json,
// `form`). The person types there and the extension copies each value into the page field the map names.
// This file is the page side of that copy.
//
// The rules that keep it narrow:
// - The form is looked up in the map of the page's own site. A form cannot be used on another site, and a
//   page without a map has no forms.
// - Only the fields the map lists are written, each found by its `id`, and only plain text inputs.
// - Each value is checked again here against the map (length, pattern), whatever the panel sent.
// - Nothing is pressed or sent: the person still reviews the page and presses the button.
// The values come from the panel's form, never from the assistant, and are not read back.

import { formForUrl } from '../plugins/registry'
import type { FormField, PanelForm } from '../plugins/schema'

const TEXT_TYPES = new Set(['', 'text', 'tel', 'number', 'search'])

/** The value as it will be written: trimmed, in upper case when the field asks for it. */
export function normalise(field: FormField, value: string): string {
  const text = value.trim()
  return field.uppercase ? text.toUpperCase() : text
}

/** Why a value cannot go in a field, in words for the person, or null when it can. */
export function fieldProblem(field: FormField, value: string): string | null {
  const text = normalise(field, value)
  if (!text) return field.optional ? null : 'Falta este dato.'
  if (text.length > field.max_length) return `Como mucho ${field.max_length} caracteres.`
  if (field.pattern && !new RegExp(`^(?:${field.pattern})$`).test(text)) return field.hint ? `No tiene el formato esperado: ${field.hint}` : 'No tiene el formato esperado.'
  return null
}

function inputFor(doc: Document, field: FormField): HTMLInputElement | null {
  const el = doc.getElementById(field.target)
  // By tag, not instanceof: an iframe's inputs come from another window's HTMLInputElement.
  if (!el || el.tagName !== 'INPUT') return null
  const input = el as HTMLInputElement
  if (!TEXT_TYPES.has(input.type) || input.disabled || input.readOnly) return null
  const style = doc.defaultView?.getComputedStyle(input)
  if (style && (style.display === 'none' || style.visibility === 'hidden')) return null
  return input
}

export type FormProbe = { present: string[] } | { error: string }
export type FillResult = { filled: string[]; missing: string[]; rejected: string[] } | { error: string }

const NO_FORM = 'Esta página no tiene ese formulario en su mapa.'

/** The ids of the form's fields that are on this page right now. */
export function probeForm(doc: Document, url: string, formId: string): FormProbe {
  const form = formForUrl(url, formId)
  if (!form) return { error: NO_FORM }
  return { present: form.fields.filter((field) => inputFor(doc, field)).map((field) => field.id) }
}

function write(input: HTMLInputElement, value: string): void {
  const view = input.ownerDocument.defaultView
  // The prototype's setter, so pages that track their inputs (React and the like) notice the change.
  const setter = view && Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, 'value')?.set
  if (setter) setter.call(input, value)
  else input.value = value
  const Event = view?.Event ?? globalThis.Event
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * Copies the person's values into the form's fields. Reports field ids only: `filled`, `missing` (the
 * field is not on this page) and `rejected` (the value does not fit the field). Empty values are skipped.
 */
export function fillForm(doc: Document, url: string, formId: string, values: Record<string, string>): FillResult {
  const form: PanelForm | undefined = formForUrl(url, formId)
  if (!form) return { error: NO_FORM }
  const result = { filled: [] as string[], missing: [] as string[], rejected: [] as string[] }
  for (const field of form.fields) {
    const raw = values[field.id]
    if (typeof raw !== 'string' || !normalise(field, raw)) continue
    if (fieldProblem(field, raw)) {
      result.rejected.push(field.id)
      continue
    }
    const input = inputFor(doc, field)
    if (!input) {
      result.missing.push(field.id)
      continue
    }
    write(input, normalise(field, raw))
    result.filled.push(field.id)
  }
  return result
}
