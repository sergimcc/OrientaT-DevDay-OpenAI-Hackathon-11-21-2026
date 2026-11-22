import type { PageRequest } from '../page/messages'
import { record } from '../ui/debugLog'
import type { Browser, Tab } from './tools'
import { userWindowId } from './userWindow'

const LOAD_TIMEOUT_MS = 20_000

function toTab(tab: chrome.tabs.Tab | undefined): Tab | null {
  if (!tab || tab.id === undefined || !tab.url) return null
  return { id: tab.id, url: tab.url, title: tab.title ?? '' }
}

export async function activeTab(): Promise<Tab | null> {
  // Chrome: the side panel's window. Safari (window mode): the last focused normal window.
  const windowId = await userWindowId()
  if (windowId === undefined) return null
  const [tab] = await chrome.tabs.query({ active: true, windowId })
  return toTab(tab)
}

function loaded(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      chrome.tabs.onUpdated.removeListener(listener)
      clearTimeout(timer)
      resolve()
    }
    const listener = (id: number, info: { status?: string }) => {
      if (id === tabId && info.status === 'complete') done()
    }
    const timer = setTimeout(done, LOAD_TIMEOUT_MS)
    chrome.tabs.onUpdated.addListener(listener)
  })
}

export const chromeBrowser: Browser = {
  activeTab,
  async frames(tabId) {
    // Chrome injects only into frames this extension may read (the official hosts), and reports which.
    const injected = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ['content.js'] })
    const ids = injected.map((result) => result.frameId)
    return ids.includes(0) ? [0, ...ids.filter((id) => id !== 0)] : ids
  },
  async page<T>(tabId: number, request: PageRequest, frameId = 0): Promise<T> {
    await chrome.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, files: ['content.js'] })
    const [frame] = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      func: (operation: PageRequest) => globalThis.__asistenteTramites?.run(operation),
      args: [request],
    })
    if (frame?.result == null) throw new Error('La página cambió mientras se leía. Vuelve a leerla.')
    record('page', { op: request.op, frameId })
    return frame.result as T
  },
  async navigate(tabId, url) {
    const wait = loaded(tabId)
    await chrome.tabs.update(tabId, { url })
    await wait
    const tab = toTab(await chrome.tabs.get(tabId))
    if (!tab) throw new Error('La pestaña se cerró mientras cargaba.')
    return tab
  },
}

/** Removes the highlight from the person's tab (after «Hecho, sigue»). Never throws. */
export async function clearHighlight(): Promise<void> {
  const tab = await activeTab().catch(() => null)
  if (!tab) return
  await chrome.scripting
    .executeScript({ target: { tabId: tab.id, allFrames: true }, func: () => globalThis.__asistenteTramites?.run({ op: 'clear' }) })
    .catch(() => undefined)
}

/** How often the panel renews the "assistant at work" frame; it expires after FRAME_TTL_MS (frame.ts). */
export const FRAME_RENEW_MS = 3000

/**
 * Shows or hides the "assistant at work" frame on a tab (src/page/frame.ts). Only official pages accept
 * it: on any other page the injection or the page script refuses, and this stays quiet. Never throws.
 */
export async function setWorkingFrame(tabId: number, on: boolean, approved: string[], label?: string): Promise<void> {
  try {
    if (on) await chrome.scripting.executeScript({ target: { tabId, frameIds: [0] }, files: ['content.js'] })
    await chrome.scripting.executeScript({
      target: { tabId, frameIds: [0] },
      func: (request: PageRequest) => globalThis.__asistenteTramites?.run(request),
      args: [{ op: 'frame', on, approved, ...(label ? { label } : {}) }],
    })
  } catch {
    // Decoration only: a page the extension may not touch simply has no frame.
  }
}

/**
 * Loads the page script into every frame of a tab as soon as the page is there, so sensitive fields are
 * covered (src/page/mask.ts) before the person types, not only after the assistant first reads the page.
 * Chrome injects only where this extension has access (the official hosts); elsewhere it stays quiet.
 */
export async function preparePage(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ['content.js'] }).catch(() => undefined)
}
