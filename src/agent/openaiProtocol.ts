import { z } from 'zod'

const text = z.object({ type: z.literal('text'), text: z.string() })
const toolUse = z.object({ type: z.literal('tool_use'), id: z.string(), name: z.string(), input: z.record(z.string(), z.unknown()) })
const toolResult = z.object({ type: z.literal('tool_result'), tool_use_id: z.string(), content: z.union([z.string(), z.array(text)]), is_error: z.boolean().optional() })
const block = z.union([
  text, toolUse, toolResult,
  // Blocks only Claude produces (thinking, server tool use, search results) when the person switches
  // provider mid-conversation. OpenAI cannot read them; they are dropped.
  z.object({ type: z.string() }).loose(),
])
const functionTool = z.object({ name: z.string(), description: z.string().optional(), input_schema: z.record(z.string(), z.unknown()) })
/** A server tool such as Claude's web search (`web_search_20260209`): no input schema, run by the provider. */
const serverTool = z.object({ type: z.string(), name: z.string() }).loose()
const request = z.object({
  system: z.union([z.string(), z.array(text)]),
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.union([z.string(), z.array(block)]) })).min(1).max(200),
  tools: z.array(z.union([functionTool, serverTool])).max(20),
})

function openaiTool(raw: z.infer<typeof request>['tools'][number]): Record<string, unknown> | null {
  const tool = functionTool.safeParse(raw)
  if (tool.success) return { type: 'function', name: tool.data.name, description: tool.data.description, parameters: tool.data.input_schema, strict: false }
  // OpenAI's own web search plays the same part: find the official page for procedures no map covers.
  const server = serverTool.safeParse(raw)
  if (server.success && server.data.type.startsWith('web_search')) return { type: 'web_search' }
  return null
}

/**
 * Adapt the existing tool loop; all page permissions remain enforced in tools/content.ts. `serviceTier`
 * is OpenAI's processing tier (`ultrafast`, `fast`…); left out, OpenAI uses the project's default.
 */
export function extensionRequest(raw: unknown, model: string, serviceTier?: string) {
  const body = request.parse(raw)
  const input: Record<string, unknown>[] = []
  for (const message of body.messages) {
    if (typeof message.content === 'string') { input.push({ role: message.role, content: message.content }); continue }
    for (const raw of message.content) {
      const said = text.safeParse(raw), use = toolUse.safeParse(raw), result = toolResult.safeParse(raw)
      if (said.success) input.push({ role: message.role, content: said.data.text })
      if (use.success) input.push({ type: 'function_call', call_id: use.data.id, name: use.data.name, arguments: JSON.stringify(use.data.input) })
      if (result.success) {
        const { tool_use_id, content } = result.data
        input.push({ type: 'function_call_output', call_id: tool_use_id, output: typeof content === 'string' ? content : content.map(item => item.text).join('\n') })
      }
    }
  }
  return {
    model, ...(serviceTier ? { service_tier: serviceTier } : {}), store: false, max_output_tokens: 4000,
    instructions: typeof body.system === 'string' ? body.system : body.system.map(part => part.text).join('\n'),
    input,
    tools: body.tools.map(openaiTool).filter(tool => tool !== null),
  }
}

export type ExtensionReply = {
  content: ({ type: 'text'; text: string } | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> })[]
  stop_reason: 'end_turn' | 'tool_use' | 'refusal' | 'max_tokens'
  /** Pages OpenAI's web search cited in this reply, shown as the panel's sources. */
  sources?: { title: string; url: string }[]
}

/**
 * OpenAI's web search marks citations with private-use characters: «\uE200cite\uE202turn0search6\uE201».
 * They should arrive as annotations, but the model sometimes writes them into the text, where they show up
 * as boxes. Drop them, any stray character of that block, and the space left before punctuation.
 */
export function stripCitationMarkers(text: string): string {
  return text
    .replace(/\uE200[^\uE201]*\uE201/g, '')
    // The same markers written without their private-use characters: «citeturn650182search6».
    .replace(/[ \t]?\b(?:cite|filecite)(?:turn\d+[a-z]+\d+)+/gi, '')
    .replace(/[\uE200-\uE2FF]/g, '')
    .replace(/[ \t]+([.,;:!?)])/g, '$1')
    .replace(/[ \t]+$/gm, '')
}

export function extensionReply(raw: unknown): ExtensionReply {
  const data = z.object({ status: z.string(), output: z.array(z.object({
    type: z.string(), call_id: z.string().optional(), name: z.string().optional(), arguments: z.string().optional(),
    content: z.array(z.object({
      type: z.string(), text: z.string().optional(), refusal: z.string().optional(),
      annotations: z.array(z.object({ type: z.string(), url: z.string().optional(), title: z.string().optional() }).loose()).optional(),
    })).optional(),
  })) }).parse(raw)
  if (!['completed', 'incomplete'].includes(data.status)) throw new Error('OpenAI no ha completado la respuesta.')
  const content: ExtensionReply['content'] = []
  const sources = new Map<string, string>()
  let refusal = false
  for (const item of data.output) {
    if (item.type === 'function_call') {
      // Never parse or run tool calls from a truncated response.
      if (data.status === 'incomplete') continue
      if (!item.call_id || !item.name || !item.arguments) throw new Error('Llamada de herramienta incompleta.')
      content.push({ type: 'tool_use', id: item.call_id, name: item.name, input: z.record(z.string(), z.unknown()).parse(JSON.parse(item.arguments)) })
    }
    if (item.type === 'message') for (const part of item.content ?? []) {
      if (part.type === 'refusal') refusal = true
      for (const note of part.annotations ?? []) {
        if (note.type === 'url_citation' && note.url?.startsWith('https://') && !sources.has(note.url)) sources.set(note.url, note.title || note.url)
      }
      const said = part.text ? stripCitationMarkers(part.text) : part.refusal
      if (said?.trim()) content.push({ type: 'text', text: said })
    }
  }
  if (!content.length && data.status === 'completed' && !refusal) throw new Error('OpenAI ha devuelto una respuesta vacía.')
  const reply: ExtensionReply = { content, stop_reason: refusal ? 'refusal' : data.status === 'incomplete' ? 'max_tokens' : content.some(part => part.type === 'tool_use') ? 'tool_use' : 'end_turn' }
  if (sources.size) reply.sources = [...sources].map(([url, title]) => ({ title, url }))
  return reply
}
