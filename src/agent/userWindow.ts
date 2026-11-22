/**
 * Which browser window is "the user's".
 *
 * In Chrome the UI is a side panel, so the panel's own window (`chrome.windows.getCurrent()`) is the
 * user's window. Safari has no side panel (no `chrome.sidePanel`): the UI opens in a narrow popup window
 * of its own (`src/background.ts`), so "current window" would be the panel. In that "window mode" the
 * user's window is the last focused NORMAL window, which this module remembers.
 */

type WindowLike = { id?: number; type?: string; focused?: boolean }

/** True when the UI cannot live in a side panel (Safari), so it runs in its own window. */
export function windowMode(): boolean {
  return typeof chrome === 'undefined' || !chrome.sidePanel
}

/**
 * The user's window among `windows`: the most recently focused one that is still an open normal
 * window, else the focused normal window, else the first normal window. `exclude` is the panel's own
 * window. `recent` is most recent first and may hold popup ids (the panel, the work window): they are
 * skipped because they are not normal windows.
 */
export function pickUserWindow(windows: WindowLike[], recent: number[], exclude?: number): number | undefined {
  const normal = windows.filter((w) => w.id !== undefined && w.id !== exclude && (w.type === undefined || w.type === 'normal'))
  const ids = new Set(normal.map((w) => w.id))
  const last = recent.find((id) => ids.has(id))
  if (last !== undefined) return last
  return (normal.find((w) => w.focused) ?? normal[0])?.id
}

/** Window ids in the order they were focused, most recent first (kept short). */
const recent: number[] = []
let tracking = false

/** Starts remembering which windows were focused (once). Synchronous, so a refresh right after sees it. */
export function trackUserWindow(): void {
  if (tracking) return
  tracking = true
  // The background opens the panel window with `?window=<id>` of the window the toolbar was clicked in.
  const seed = Number(new URLSearchParams(globalThis.location?.search ?? '').get('window'))
  if (Number.isInteger(seed) && seed > 0 && !recent.includes(seed)) recent.push(seed)
  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return
    const at = recent.indexOf(windowId)
    if (at >= 0) recent.splice(at, 1)
    recent.unshift(windowId)
    recent.length = Math.min(recent.length, 16)
  })
}

/** The id of the user's window: the panel's own window in Chrome, the last focused normal window in Safari. */
export async function userWindowId(): Promise<number | undefined> {
  if (!windowMode()) return (await chrome.windows.getCurrent()).id
  trackUserWindow()
  const [all, self] = await Promise.all([
    chrome.windows.getAll({ windowTypes: ['normal'] }),
    // Safari can report the focused website window as current when the panel is behind it.
    // The extension tab identifies the actual panel window regardless of focus.
    chrome.tabs.getCurrent().catch(() => undefined),
  ])
  return pickUserWindow(all, recent, self?.windowId)
}

/** The user's window itself (for its incognito flag and bounds). */
export async function userWindow(): Promise<chrome.windows.Window | undefined> {
  if (!windowMode()) return chrome.windows.getCurrent()
  const id = await userWindowId()
  return id === undefined ? undefined : chrome.windows.get(id).catch(() => undefined)
}
