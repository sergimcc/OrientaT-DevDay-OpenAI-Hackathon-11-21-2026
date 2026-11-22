import type { FillResult, FormProbe } from '../page/form'
import type { Browser } from './tools'

// The panel side of a panel form (src/page/form.ts): ask the page which of the form's fields it has, and
// copy the person's values into them. The values go from the panel's form straight to the page. They are
// never put in the conversation, a tool result or the debug log.

async function eachFrame<T extends object>(browser: Browser, tabId: number, run: (frameId: number) => Promise<T | { error: string }>): Promise<T[]> {
  const frames = await browser.frames(tabId).catch(() => [0])
  const results: T[] = []
  for (const frameId of frames.length ? frames : [0]) {
    // A frame from another site has no such form and says so: it is skipped.
    const result = await run(frameId).catch(() => null)
    if (result && !('error' in result)) results.push(result)
  }
  return results
}

/** The ids of the form's fields found on the page, in any of its frames. */
export async function probePageForm(browser: Browser, tabId: number, formId: string, approved: string[]): Promise<string[]> {
  const found = await eachFrame(browser, tabId, (frameId) => browser.page<FormProbe>(tabId, { op: 'form', form: formId, approved }, frameId))
  return [...new Set(found.flatMap((probe) => probe.present))]
}

export type PageFill = { filled: string[]; failed: string[] }

/** Copies `values` (field id → what the person typed) into the page. Reports field ids, never values. */
export async function fillPageForm(browser: Browser, tabId: number, formId: string, values: Record<string, string>, approved: string[]): Promise<PageFill> {
  const done = await eachFrame(browser, tabId, (frameId) => browser.page<FillResult>(tabId, { op: 'fill', form: formId, values, approved }, frameId))
  const filled = new Set(done.flatMap((result) => result.filled))
  const failed = new Set(done.flatMap((result) => [...result.missing, ...result.rejected]).filter((id) => !filled.has(id)))
  return { filled: [...filled], failed: [...failed] }
}
