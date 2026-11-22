// What the panel asks the page script to do: read, press a control that only moves around the site, and
// point at a control for the person. There is no select, tick or submit, and no free typing. The one way
// to write is `fill`: it copies what the person typed in a panel form into the fields that the page's own
// site map declares for that form (src/page/form.ts). The panel sends it; the assistant has no tool that
// carries a value, and never sees one.
// `approved` carries the hosts the person approved in this session, on top of the built-in trusted ones.

export type PageRequest =
  | { op: 'outline'; query?: string; ref_prefix?: string; approved?: string[] }
  | { op: 'table'; ref: string; offset?: number; max_rows?: number; approved?: string[] }
  | { op: 'click'; ref: string; approved?: string[] }
  | { op: 'point'; ref: string; instruction: string; approved?: string[] }
  /** Which fields of a site-map form are on this page. */
  | { op: 'form'; form: string; approved?: string[] }
  /** Copies the person's values (field id → value) into that form's fields. */
  | { op: 'fill'; form: string; values: Record<string, string>; approved?: string[] }
  | { op: 'clear' }
  // The "assistant at work" border (frame.ts). `on: false` hides it on any page, like `clear`.
  | { op: 'frame'; on: boolean; label?: string; approved?: string[] }
