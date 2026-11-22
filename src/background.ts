import { WEB_ORIGINS, cleanHandoff, pendingKey } from './handoff'
import type { HandoffRequest, HandoffResponse, PendingTask } from './handoff'
import { trustOf } from './trust'

// The toolbar button opens the side panel on any tab. The assistant itself only reads and moves on the
// official sites listed in the site maps; elsewhere the panel explains that it cannot help on that page.

// Safari has no side panel (no `chrome.sidePanel`): the toolbar button opens the panel in a narrow window
// of its own instead.
const hasSidePanel = typeof chrome.sidePanel !== 'undefined'
const PANEL_WINDOW_KEY = 'panelWindowId'
const PANEL_WIDTH = 420
const PANEL_HEIGHT = 800

async function openPanelWindow(fromWindowId: number | undefined): Promise<void> {
  const stored = (await chrome.storage.session.get(PANEL_WINDOW_KEY))[PANEL_WINDOW_KEY] as number | undefined
  if (stored !== undefined) {
    const open = await chrome.windows.get(stored, { populate: true }).catch(() => undefined)
    if (open?.tabs?.some((tab) => tab.url?.startsWith(chrome.runtime.getURL('sidepanel.html')))) {
      await chrome.windows.update(stored, { focused: true })
      return
    }
  }
  const from = fromWindowId !== undefined ? await chrome.windows.get(fromWindowId).catch(() => undefined) : undefined
  const left = from?.left !== undefined && from.width !== undefined ? from.left + from.width - PANEL_WIDTH : undefined
  const url = chrome.runtime.getURL(`sidepanel.html${from?.id !== undefined ? `?window=${from.id}` : ''}`)
  const created = await chrome.windows
    .create({ url, type: 'popup', width: PANEL_WIDTH, height: from?.height ?? PANEL_HEIGHT, left, top: from?.top, focused: true })
    .catch(() => chrome.windows.create({ url, type: 'popup', width: PANEL_WIDTH, focused: true }))
  if (created?.id !== undefined) await chrome.storage.session.set({ [PANEL_WINDOW_KEY]: created.id })
}

if (hasSidePanel) {
  const openOnClick = () => void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  chrome.runtime.onInstalled.addListener(openOnClick)
  chrome.runtime.onStartup.addListener(openOnClick)
} else {
  chrome.action.onClicked.addListener((tab) => void openPanelWindow(tab.windowId))
  chrome.windows.onRemoved.addListener((windowId) => {
    void chrome.storage.session.get(PANEL_WINDOW_KEY).then(async (stored) => {
      if (stored[PANEL_WINDOW_KEY] === windowId) await chrome.storage.session.remove(PANEL_WINDOW_KEY)
    })
  })
}

// The website notices the extension through the bridge script. Chrome only injects declared content scripts
// into pages loaded after install, so put it into the website's tabs that are already open: the page then
// switches to «Instalada» on its own, right after the person installs.
chrome.runtime.onInstalled.addListener(() => void injectBridge())

async function injectBridge(): Promise<void> {
  const tabs = await chrome.tabs.query({ url: WEB_ORIGINS.map((o) => `${o}/*`) }).catch(() => [])
  for (const tab of tabs) {
    if (tab.id !== undefined) await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['bridge.js'] }).catch(() => undefined)
  }
}

// Hand-off from the website (see src/handoff.ts): open the official site in a new tab, open the panel,
// and leave the task for the panel to start on that tab.
chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if ((message as { type?: unknown } | null)?.type !== 'handoff') return false
  const origin = sender.origin ?? (sender.url ? new URL(sender.url).origin : undefined)
  if (sender.id !== chrome.runtime.id || !origin || !WEB_ORIGINS.includes(origin)) {
    sendResponse({ ok: false, reason: 'origin' } satisfies HandoffResponse)
    return false
  }
  const request = cleanHandoff(message)
  if (!request) {
    sendResponse({ ok: false, reason: 'url' } satisfies HandoffResponse)
    return false
  }
  // Open the panel first, synchronously in the listener, while Chrome may still count the person's click
  // on the website as the user gesture sidePanel.open() requires. If it refuses, the badge says where to click.
  const windowId = sender.tab?.windowId
  const panel: Promise<boolean> =
    hasSidePanel && windowId !== undefined ? chrome.sidePanel.open({ windowId }).then(() => true, () => false) : Promise.resolve(false)
  void startHandoff(request, sender.tab, panel).then(sendResponse)
  return true
})

async function startHandoff(request: HandoffRequest, from: chrome.tabs.Tab | undefined, panel: Promise<boolean>): Promise<HandoffResponse> {
  let url: URL
  try {
    url = new URL(request.url)
  } catch {
    return { ok: false, reason: 'url' }
  }
  // Only sites the assistant may use without asking: mapped ones and public-administration domains.
  const trust = trustOf(url.href)
  if (url.protocol !== 'https:' || (trust !== 'mapped' && trust !== 'government')) return { ok: false, reason: 'url' }

  const tab = await chrome.tabs
    .create({ url: url.href, active: true, windowId: from?.windowId, index: from?.index !== undefined ? from.index + 1 : undefined, openerTabId: from?.id })
    .catch(() => undefined)
  if (tab?.id === undefined) return { ok: false, reason: 'tab' }
  const task: PendingTask = { text: request.text, url: url.href, procedure: request.procedure, context: request.context, at: Date.now() }
  await chrome.storage.session.set({ [pendingKey(tab.id)]: task })

  if (!hasSidePanel) {
    await openPanelWindow(tab.windowId)
    return { ok: true, panel: true }
  }
  const opened = await panel
  if (!opened) {
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#F20D0D' })
    await chrome.action.setBadgeText({ tabId: tab.id, text: '1' })
    await chrome.action.setTitle({ tabId: tab.id, title: 'Pulsa para seguir con tu trámite' })
  }
  return { ok: true, panel: opened }
}
