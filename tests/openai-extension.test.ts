import { afterEach, describe, expect, it, vi } from 'vitest'
import { extensionReply, extensionRequest, stripCitationMarkers } from '../src/agent/openaiProtocol'
import { createLocalClient } from '../src/agent/localClient'
import { runTurn } from '../src/agent/agent'
import { ToolState } from '../src/agent/tools'

afterEach(() => vi.unstubAllGlobals())

describe('local OpenAI extension bridge', () => {
  it('preserves tool call IDs and results in the next Responses request', () => {
    const body = extensionRequest({ system: [{ type: 'text', text: 'Guide only' }], tools: [{ name: 'find_procedure', input_schema: { type: 'object' } }], messages: [
      { role: 'user', content: 'vida laboral' },
      { role: 'assistant', content: [{ type: 'tool_use', id: 'call1', name: 'find_procedure', input: { query: 'vida laboral' } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'call1', content: 'map result' }] },
    ] }, 'server-model', 'ultrafast')
    expect(body.model).toBe('server-model')
    expect(body.service_tier).toBe('ultrafast')
    expect(body.store).toBe(false)
    expect(body.input[1]).toMatchObject({ type: 'function_call', call_id: 'call1', arguments: '{"query":"vida laboral"}' })
    expect(body.input[2]).toEqual({ type: 'function_call_output', call_id: 'call1', output: 'map result' })
  })

  it('maps Claude web search to OpenAI web search and drops blocks only Claude reads', () => {
    const body = extensionRequest({ system: 'Guide only', tools: [
      { name: 'read_page', input_schema: { type: 'object' } },
      { type: 'web_search_20260209', name: 'web_search', max_uses: 5 },
    ], messages: [
      { role: 'user', content: 'empadronarme' },
      { role: 'assistant', content: [{ type: 'thinking', thinking: '…', signature: 's' }, { type: 'server_tool_use', id: 'srv', name: 'web_search', input: {} }, { type: 'text', text: 'Busco la web.' }] },
      { role: 'user', content: 'sigue' },
    ] }, 'm')
    expect(body.tools).toEqual([{ type: 'function', name: 'read_page', description: undefined, parameters: { type: 'object' }, strict: false }, { type: 'web_search' }])
    expect(body.input).toEqual([{ role: 'user', content: 'empadronarme' }, { role: 'assistant', content: 'Busco la web.' }, { role: 'user', content: 'sigue' }])
  })

  it('removes the web search citation markers the model writes into the text', () => {
    const leaked = 'Ten a mano tu DNI actual: puedes usar sus datos para entrar en la web oficial. \uE200cite\uE202turn230076search6\uE202turn230076search1\uE201'
    expect(stripCitationMarkers(leaked)).toBe('Ten a mano tu DNI actual: puedes usar sus datos para entrar en la web oficial.')
    expect(stripCitationMarkers('Pide cita \uE200cite\uE202turn0search0\uE201, luego ve.')).toBe('Pide cita, luego ve.')
    expect(stripCitationMarkers('Resto\uE202 suelto\uE201')).toBe('Resto suelto')
    expect(stripCitationMarkers('Sin marcas: 3 pasos (y nada más).')).toBe('Sin marcas: 3 pasos (y nada más).')
  })

  it('passes cited pages on as sources and drops a message that was only markers', () => {
    const reply = extensionReply({ status: 'completed', output: [
      { type: 'web_search_call', id: 'ws1' },
      { type: 'message', content: [{ type: 'output_text', text: 'Pide cita en la web oficial. \uE200cite\uE202turn0search1\uE201', annotations: [
        { type: 'url_citation', url: 'https://www.citapreviadnie.es/citaPreviaDni/', title: 'Cita previa DNI', start_index: 0, end_index: 10 },
        { type: 'url_citation', url: 'https://www.citapreviadnie.es/citaPreviaDni/', title: 'Repetida' },
        { type: 'url_citation', url: 'http://inseguro.example/', title: 'Sin https' },
      ] }] },
      { type: 'message', content: [{ type: 'output_text', text: '\uE200cite\uE202turn0search2\uE201' }] },
    ] })
    expect(reply.content).toEqual([{ type: 'text', text: 'Pide cita en la web oficial.' }])
    expect(reply.sources).toEqual([{ title: 'Cita previa DNI', url: 'https://www.citapreviadnie.es/citaPreviaDni/' }])
  })

  it('does not execute truncated tool calls', () => {
    expect(extensionReply({ status: 'incomplete', output: [{ type: 'function_call', call_id: 'c', name: 'click', arguments: '{' }] })).toEqual({ content: [], stop_reason: 'max_tokens' })
  })

  it('runs a mapped tool and continues the conversation without a browser API key', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(Response.json(extensionReply({ status: 'completed', output: [
      { type: 'function_call', call_id: 'c1', name: 'find_procedure', arguments: '{"query":"vida laboral"}' },
    ] }))).mockResolvedValueOnce(Response.json(extensionReply({ status: 'completed', output: [
      { type: 'message', content: [{ type: 'output_text', text: 'Aquí tienes los pasos.' }] },
    ] })))
    vi.stubGlobal('fetch', mockFetch)
    const onText = vi.fn()
    const result = await runTurn({ client: createLocalClient(), model: 'claude-opus-5-5', effort: 'medium',
      history: [{ role: 'user', content: 'vida laboral' }], state: new ToolState(),
      host: { browser: { activeTab: async () => null, frames: async () => [], page: async () => { throw new Error('unexpected') }, navigate: async () => { throw new Error('unexpected') } }, ask: async () => 'sí', approveSite: async () => false, approvedHosts: () => [] },
      events: { text: onText, toolStart() {}, toolEnd() {} },
    })
    expect(result.stop).toBe('end_turn')
    expect(onText).toHaveBeenCalledWith('Aquí tienes los pasos.', 1)
    expect(mockFetch).toHaveBeenCalledTimes(2)
    const [url, options] = mockFetch.mock.calls[1]!
    expect(url).toBe('http://127.0.0.1:5173/api/extension')
    expect(options.headers).not.toHaveProperty('Authorization')
    const resultBlock = JSON.parse(options.body).messages.at(-1).content[0]
    expect(resultBlock).toMatchObject({ type: 'tool_result', tool_use_id: 'c1' })
    expect(resultBlock.is_error).toBeUndefined()
  })

  it('does not retry rejected credentials', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('Clave no válida', { status: 502 }))
    vi.stubGlobal('fetch', mockFetch)
    const client = createLocalClient()
    await expect(client.beta.messages.stream({ model: 'unused', max_tokens: 1, messages: [] }).finalMessage()).rejects.toThrow('Clave no válida')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

describe('OpenAI citation markers', () => {
  it('are removed from the text the panel shows', () => {
    const raw = 'Pide cita en la web oficial citeturn650182search6. Lleva una foto citeturn650182search6 reciente.'
    const reply = extensionReply({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: raw }] }] })
    expect(reply.content).toEqual([{ type: 'text', text: 'Pide cita en la web oficial. Lleva una foto reciente.' }])
  })

  it('leave ordinary words alone', () => {
    expect(stripCitationMarkers('Para citar la cita previa, recite el número.')).toBe('Para citar la cita previa, recite el número.')
  })
})
