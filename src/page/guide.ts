// The highlight the person sees when the assistant points at something only they may do: a ring around
// the control and a callout with one short instruction ("Escribe aquí tu número de DNI"). It stays until the next
// highlight, an explicit clear, or the page going away. Like the cursor it lives in a closed shadow root
// outside <body>, so the outline never reads it and the page's CSS never styles it.

const HOST_ID = 'asistente-tramites-guide'

const STYLE = `
:host { all: initial; }
.layer { position: fixed; inset: 0; pointer-events: none; z-index: 2147483646; }
.ring {
  position: fixed; border: 3px solid #e2b341; border-radius: 8px;
  box-shadow: 0 0 0 4000px rgba(17, 21, 28, 0.18), 0 0 0 6px rgba(226, 179, 65, 0.35);
  transition: all 0.2s ease;
}
.callout {
  position: fixed; max-width: 300px; padding: 10px 12px; border-radius: 10px;
  background: #161b24; color: #f3f5f9; font: 500 14px/1.4 "IBM Plex Sans", system-ui, sans-serif;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35); border: 1px solid #e2b341;
}
.callout b { display: block; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: #e2b341; margin-bottom: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .ring { animation: pulse 1.8s ease-in-out infinite; }
}
@keyframes pulse { 50% { box-shadow: 0 0 0 4000px rgba(17, 21, 28, 0.18), 0 0 0 10px rgba(226, 179, 65, 0.15); } }
`

type Guide = { host: HTMLElement; ring: HTMLElement; callout: HTMLElement; target: Element; frame: number; stop: () => void }

let current: Guide | null = null

function place(g: Guide): void {
  if (!g.target.isConnected) {
    clearGuide()
    return
  }
  const r = g.target.getBoundingClientRect()
  g.ring.style.left = `${r.left - 6}px`
  g.ring.style.top = `${r.top - 6}px`
  g.ring.style.width = `${r.width + 12}px`
  g.ring.style.height = `${r.height + 12}px`
  const view = g.target.ownerDocument.defaultView
  const height = view?.innerHeight ?? 800
  const width = view?.innerWidth ?? 1200
  const box = g.callout.getBoundingClientRect()
  const below = r.bottom + 14
  const top = below + (box.height || 60) < height ? below : Math.max(8, r.top - 14 - (box.height || 60))
  g.callout.style.top = `${top}px`
  g.callout.style.left = `${Math.min(Math.max(8, r.left), Math.max(8, width - (box.width || 300) - 8))}px`
}

/** Shows the ring and callout on `el`, replacing any earlier one. */
export function showGuide(el: Element, instruction: string): void {
  clearGuide()
  const doc = el.ownerDocument
  const host = doc.createElement('div')
  host.id = HOST_ID
  const root = host.attachShadow({ mode: 'closed' })
  const style = doc.createElement('style')
  style.textContent = STYLE
  const layer = doc.createElement('div')
  layer.className = 'layer'
  const ring = doc.createElement('div')
  ring.className = 'ring'
  const callout = doc.createElement('div')
  callout.className = 'callout'
  callout.setAttribute('role', 'status')
  const label = doc.createElement('b')
  label.textContent = 'Te toca a ti'
  callout.append(label, doc.createTextNode(instruction))
  layer.append(ring, callout)
  root.append(style, layer)
  doc.documentElement.append(host)
  ;(el as HTMLElement).scrollIntoView?.({ block: 'center', inline: 'nearest' })
  const view = doc.defaultView ?? window
  const g: Guide = { host, ring, callout, target: el, frame: 0, stop: () => {} }
  const onMove = () => {
    view.cancelAnimationFrame?.(g.frame)
    g.frame = view.requestAnimationFrame?.(() => place(g)) ?? 0
  }
  view.addEventListener('scroll', onMove, true)
  view.addEventListener('resize', onMove)
  g.stop = () => {
    view.removeEventListener('scroll', onMove, true)
    view.removeEventListener('resize', onMove)
    view.cancelAnimationFrame?.(g.frame)
  }
  current = g
  place(g)
}

export function clearGuide(): void {
  if (!current) return
  current.stop()
  current.host.remove()
  current = null
}

export function guideShown(): boolean {
  return current !== null
}
