// A visible pointer that glides to each element before the assistant presses or points at it, so the
// person can watch what it does. It is drawn in the top frame when this frame can reach it (same-origin
// iframes, common in older government applications), otherwise in this frame. It lives in a closed
// shadow root outside <body>, so `readOutline` never reads it and the page's CSS never styles it.

const HOST_ID = 'asistente-tramites-cursor'
const MOVE_MS = 520
const CLICK_MS = 260
const HIDE_AFTER_MS = 6000

const STYLE = `
:host { all: initial; }
.layer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483647; }
.pointer {
  position: fixed; left: 0; top: 0; width: 28px; height: 28px;
  transform: translate(-100px, -100px);
  transition: transform ${MOVE_MS}ms cubic-bezier(0.22, 0.8, 0.26, 1), opacity 0.25s ease;
  filter: drop-shadow(0 2px 3px rgba(0,0,0,0.35));
  will-change: transform;
}
.label {
  position: absolute; left: 22px; top: 22px; white-space: nowrap;
  font: 600 11px/1 "IBM Plex Sans", system-ui, sans-serif;
  background: #161b24; color: #7c9cff; padding: 4px 7px; border-radius: 999px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3); max-width: 260px; overflow: hidden; text-overflow: ellipsis;
}
.ring {
  position: fixed; left: 0; top: 0; width: 36px; height: 36px; margin: -18px 0 0 -18px;
  border: 3px solid #7c9cff; border-radius: 50%; opacity: 0;
}
.ring.go { animation: ripple ${CLICK_MS + 240}ms ease-out; }
.box {
  position: fixed; border: 2px solid #7c9cff; border-radius: 6px; background: rgba(124,156,255,0.12);
  opacity: 0; transition: all 0.3s ease;
}
@keyframes ripple { 0% { opacity: 0.95; transform: scale(0.3); } 100% { opacity: 0; transform: scale(1.6); } }
@media (prefers-reduced-motion: reduce) { .pointer { transition: none; } }
`

const ARROW = `<svg viewBox="0 0 28 28" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
<path d="M4 2 L4 22 L9.5 17 L13.2 25.5 L16.6 24 L13 15.8 L20.5 15.8 Z" fill="#161b24" stroke="#7c9cff" stroke-width="1.8" stroke-linejoin="round"/></svg>`

type Parts = { doc: Document; host: HTMLElement; pointer: HTMLElement; label: HTMLElement; ring: HTMLElement; box: HTMLElement; hideTimer?: number }

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms))

/** The top document if this frame may draw there, and how to move a rect into its coordinates. */
function drawingSurface(): { doc: Document; offset: (r: DOMRect) => { x: number; y: number } } {
  let dx = 0
  let dy = 0
  let win: Window = window
  try {
    while (win !== win.parent) {
      const frame = win.frameElement as HTMLElement | null
      if (!frame) throw new Error('cross-origin')
      const fr = frame.getBoundingClientRect()
      dx += fr.left + frame.clientLeft
      dy += fr.top + frame.clientTop
      win = win.parent
    }
    const doc = win.document
    // A <frameset> page renders nothing but its frames, so draw in this frame instead.
    if (doc.body?.tagName === 'FRAMESET') throw new Error('frameset')
    return { doc, offset: (r) => ({ x: r.left + dx, y: r.top + dy }) }
  } catch {
    return { doc: document, offset: (r) => ({ x: r.left, y: r.top }) }
  }
}

function parts(doc: Document): Parts {
  const existing = (doc as Document & { __asistenteCursor?: Parts }).__asistenteCursor
  if (existing?.host.isConnected) {
    if (doc.documentElement.lastElementChild !== existing.host) doc.documentElement.append(existing.host)
    return existing
  }
  const host = doc.createElement('div')
  host.id = HOST_ID
  const root = host.attachShadow({ mode: 'closed' })
  const style = doc.createElement('style')
  style.textContent = STYLE
  const layer = doc.createElement('div')
  layer.className = 'layer'
  const box = doc.createElement('div')
  box.className = 'box'
  const ring = doc.createElement('div')
  ring.className = 'ring'
  const pointer = doc.createElement('div')
  pointer.className = 'pointer'
  pointer.innerHTML = ARROW
  const label = doc.createElement('div')
  label.className = 'label'
  label.textContent = 'Asistente'
  pointer.append(label)
  layer.append(box, ring, pointer)
  root.append(style, layer)
  doc.documentElement.append(host)
  const made = { doc, host, pointer, label, ring, box }
  ;(doc as Document & { __asistenteCursor?: Parts }).__asistenteCursor = made
  return made
}

export function clearCursor(): void {
  const p = (document as Document & { __asistenteCursor?: Parts }).__asistenteCursor
  if (p?.hideTimer !== undefined) window.clearTimeout(p.hideTimer)
  p?.host.remove()
}

/** Glide the pointer to `el`, outline it, and (for clicks) show a click ripple. Never throws. */
export async function pointAt(el: Element, label: string, clicking: boolean): Promise<void> {
  // Nobody watches a hidden tab, and Chrome slows its timers to a second: skip the show.
  if (document.visibilityState !== 'visible') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  try {
    ;(el as HTMLElement).scrollIntoView?.({ block: 'center', inline: 'center', behavior: 'instant' as ScrollBehavior })
    await wait(80)
    const surface = drawingSurface()
    const p = parts(surface.doc)
    const rect = el.getBoundingClientRect()
    const { x, y } = surface.offset(rect)
    const tx = x + Math.min(rect.width / 2, 60)
    const ty = y + Math.min(rect.height / 2, 20)
    // The timer lives with the drawing document, so any frame's next move cancels it and it
    // survives the acting frame navigating away.
    const view = p.doc.defaultView ?? window
    if (p.hideTimer !== undefined) view.clearTimeout(p.hideTimer)
    p.label.textContent = label
    p.pointer.style.opacity = '1'
    p.box.style.left = `${x - 3}px`
    p.box.style.top = `${y - 3}px`
    p.box.style.width = `${rect.width + 6}px`
    p.box.style.height = `${rect.height + 6}px`
    p.box.style.opacity = '1'
    p.pointer.style.transform = `translate(${tx - 4}px, ${ty - 2}px)`
    await wait(MOVE_MS + 40)
    if (clicking) {
      p.ring.style.left = `${tx}px`
      p.ring.style.top = `${ty}px`
      p.ring.classList.remove('go')
      void p.ring.offsetWidth
      p.ring.classList.add('go')
      p.pointer.style.transform = `translate(${tx - 4}px, ${ty - 2}px) scale(0.85)`
      await wait(CLICK_MS)
      p.pointer.style.transform = `translate(${tx - 4}px, ${ty - 2}px)`
    }
    p.hideTimer = view.setTimeout(() => {
      p.box.style.opacity = '0'
      p.pointer.style.opacity = '0'
    }, HIDE_AFTER_MS)
  } catch {
    // The cursor is decoration: a page that refuses it must not stop the action.
  }
}
