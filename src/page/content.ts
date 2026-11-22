import { clearCursor, pointAt } from './cursor'
import { Registry, guidedClick, readOutline, readTable } from './dom'
import { fillForm, probeForm } from './form'
import { hideFrame, showFrame } from './frame'
import { clearGuide, showGuide } from './guide'
import { startMasking } from './mask'
import type { PageRequest } from './messages'
import { policyFor } from '../trust'
import { isOfficialUrl } from '../policy'

// The page script. The panel injects it into trusted pages only, and it checks again: on a page that is
// not trusted it refuses everything. The built-in trusted hosts and the control rules are bundled into this
// script; the panel only adds the hosts the person approved in this session.

declare global {
  // eslint-disable-next-line no-var
  var __asistenteTramites: { run: (request: PageRequest) => Promise<unknown> } | undefined
}

async function handle(request: PageRequest, registry: Registry): Promise<unknown> {
  // Taking something off the page is allowed anywhere; everything else only on official pages.
  const removing = request.op === 'clear' || (request.op === 'frame' && !request.on)
  const ctx = policyFor(location.href, { approved: request.op === 'clear' ? [] : request.approved ?? [] })
  // The top frame decides: an embedded frame from another host is still read, as the person sees it.
  const pageUrl = window.top === window ? location.href : document.referrer || location.href
  if (!removing && !isOfficialUrl(location.href, ctx.officialHosts) && !isOfficialUrl(pageUrl, ctx.officialHosts)) {
    return { error: 'Esta página no es una web oficial de confianza para la extensión.' }
  }
  switch (request.op) {
    case 'outline':
      registry.prefix = request.ref_prefix ?? ''
      return { url: location.href, title: document.title, ...readOutline(document, registry, ctx, request) }
    case 'table':
      return readTable(registry, request.ref, request)
    case 'click': {
      const el = registry.get(request.ref)
      const result = guidedClick(registry, request.ref, ctx)
      if (result.ok && el) {
        clearGuide()
        void pointAt(el, `Abriendo “${result.name.slice(0, 40)}”`, true)
      }
      return result
    }
    case 'point': {
      const el = registry.get(request.ref)
      if (!el) return { ok: false, error: `El elemento ${request.ref} ya no está en la página. Vuelve a leer la página.` }
      await pointAt(el, 'Aquí', false)
      showGuide(el, request.instruction)
      return { ok: true }
    }
    // Panel forms: only the fields this page's own site map declares (form.ts).
    case 'form':
      return probeForm(document, location.href, request.form)
    case 'fill':
      return fillForm(document, location.href, request.form, request.values)
    case 'clear':
      clearGuide()
      clearCursor()
      return { ok: true }
    case 'frame':
      if (request.on) showFrame(request.label ?? 'El asistente está leyendo esta página')
      else hideFrame()
      return { ok: true }
    default:
      return { error: 'Petición desconocida.' }
  }
}

if (!globalThis.__asistenteTramites) {
  const registry = new Registry()
  // From the moment the assistant touches an official page, personal data typed there shows half covered.
  startMasking(document)
  window.addEventListener('pagehide', () => {
    clearGuide()
    clearCursor()
    hideFrame()
  })
  globalThis.__asistenteTramites = { run: (request) => handle(request, registry) }
}
