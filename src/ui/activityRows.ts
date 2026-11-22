import type { Item } from './conversation'

// The transcript shows one line for a run of assistant actions, not one line per action. This file folds
// the conversation's items into that shape; `Activity.tsx` draws it.

type ToolItem = Extract<Item, { kind: 'tool' }>

export type ActivityGroup = { kind: 'activity'; id: string; items: ToolItem[] }
export type Row = Exclude<Item, ToolItem> | ActivityGroup

const TOOL_LABELS: Record<string, string> = {
  find_procedure: 'Buscando el trámite',
  get_procedure: 'Consultando los pasos del trámite',
  read_page: 'Leyendo la página',
  open_page: 'Abriendo la página',
  click: 'Moviéndome por la sede',
  point_to: 'Señalando en la página',
  show_form: 'Abriendo el formulario del panel',
  ask_user: 'Preguntándote',
  web_search: 'Buscando la web oficial en internet',
}

export const toolLabel = (name: string): string => TOOL_LABELS[name] ?? name

/** A label for one call: the reason or instruction the model gave, when there is one. */
export function labelFor(name: string, input: unknown): string {
  const data = (input ?? {}) as Record<string, unknown>
  if (name === 'click' && typeof data.reason === 'string') return data.reason
  if (name === 'point_to' && typeof data.instruction === 'string') return `Señalado: ${data.instruction}`
  if (name === 'web_search' && typeof data.query === 'string' && data.query) return `Buscando en internet: «${data.query}»`
  if (name === 'open_page' && typeof data.url === 'string') {
    try {
      return `Abriendo ${new URL(data.url).hostname}`
    } catch {
      return toolLabel(name)
    }
  }
  return toolLabel(name)
}

/** Fold each run of tool calls into one row. */
export function toRows(items: Item[]): Row[] {
  const rows: Row[] = []
  for (const item of items) {
    if (item.kind !== 'tool') {
      rows.push(item)
      continue
    }
    const last = rows[rows.length - 1]
    if (last?.kind === 'activity') last.items.push(item)
    else rows.push({ kind: 'activity', id: `activity-${item.id}`, items: [item] })
  }
  return rows
}

/** The action in progress, or null when every action in the group has finished. */
export function currentLabel(group: ActivityGroup): string | null {
  for (let index = group.items.length - 1; index >= 0; index--) {
    const item = group.items[index]
    if (item?.status === 'running') return item.label
  }
  return null
}
