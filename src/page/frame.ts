// The frame the person sees while the assistant works on this page: a yellow border around the whole
// window and a small label at the top, so it is clear the extension is reading and moving around. The
// panel shows it while a turn runs and hides it when the turn ends («Te toca a ti»). It also expires by
// itself unless the panel renews it, so a closed or crashed panel never leaves it behind. Like the cursor
// it lives in a closed shadow root outside <body>: the outline never reads it, the page's CSS never
// styles it, and it never takes a click (pointer-events: none).

const HOST_ID = 'asistente-tramites-frame'
/** The panel renews the frame more often than this (FRAME_RENEW_MS in chromeBrowser.ts). */
export const FRAME_TTL_MS = 8000

const STYLE = `
:host { all: initial; }
.frame {
  position: fixed; inset: 0; pointer-events: none; z-index: 2147483645;
  /* The same yellow as the «Te toca a ti» highlight (guide.ts). */
  border: 8px solid #e2b341; border-radius: 14px;
  /* A glow inside every edge (the frame fills the window, so an outer shadow would be off screen). */
  box-shadow: inset 0 0 90px 24px rgba(226, 179, 65, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.5);
  opacity: 0; transition: opacity 0.25s ease;
}
.frame.on { opacity: 1; }
.pill {
  position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 8px; max-width: calc(100vw - 32px);
  padding: 6px 12px 6px 10px; border-radius: 999px;
  background: #e2b341; color: #161b24; font: 600 12px/1.2 "Geist Variable", "IBM Plex Sans", system-ui, sans-serif;
  box-shadow: 0 4px 16px rgba(226, 179, 65, 0.45), 0 1px 3px rgba(0, 0, 0, 0.2); white-space: nowrap;
}
.pill span { overflow: hidden; text-overflow: ellipsis; }
.dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: #161b24; }
@media (prefers-reduced-motion: no-preference) {
  .frame.on { animation: breathe 2.4s ease-in-out infinite; }
  .dot { animation: blink 1.2s ease-in-out infinite; }
}
@keyframes breathe { 50% { box-shadow: inset 0 0 120px 34px rgba(226, 179, 65, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.5); } }
@keyframes blink { 50% { opacity: 0.35; } }
`

type Frame = { host: HTMLElement; frame: HTMLElement; label: HTMLElement; timer?: number }

let current: Frame | null = null

function build(): Frame {
  const host = document.createElement('div')
  host.id = HOST_ID
  const root = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = STYLE
  const frame = document.createElement('div')
  frame.className = 'frame'
  const pill = document.createElement('div')
  pill.className = 'pill'
  pill.setAttribute('role', 'status')
  const dot = document.createElement('i')
  dot.className = 'dot'
  const label = document.createElement('span')
  pill.append(dot, label)
  frame.append(pill)
  root.append(style, frame)
  return { host, frame, label }
}

/** Shows (or renews) the frame with `label`. Top frame only: one border around the whole window. */
export function showFrame(label: string): void {
  if (window.top !== window) return
  current ??= build()
  const f = current
  if (!f.host.isConnected || document.documentElement.lastElementChild !== f.host) document.documentElement.append(f.host)
  f.label.textContent = label
  // Next frame, so the fade-in runs when the host was just added.
  requestAnimationFrame(() => f.frame.classList.add('on'))
  if (f.timer !== undefined) clearTimeout(f.timer)
  f.timer = window.setTimeout(hideFrame, FRAME_TTL_MS)
}

export function hideFrame(): void {
  if (!current) return
  if (current.timer !== undefined) clearTimeout(current.timer)
  current.host.remove()
  current = null
}

export function frameShown(): boolean {
  return current?.host.isConnected === true
}
