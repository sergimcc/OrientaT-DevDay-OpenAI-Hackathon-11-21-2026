import Anthropic from '@anthropic-ai/sdk'
import type { BetaMessage, BetaMessageParam, BetaMessageStreamParams, BetaRawMessageStreamEvent } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { describe, expect, it, vi } from 'vitest'
import { TOOLS, requestParams, runTurn } from '../src/agent/agent'
import type { AgentClient, AgentEvents, StreamLike } from '../src/agent/agent'
import { SYSTEM_PROMPT } from '../src/agent/prompt'
import { ToolState } from '../src/agent/tools'
import type { Browser, ToolHost } from '../src/agent/tools'

type Turn = { content: unknown[]; stop_reason: BetaMessage['stop_reason']; throws?: Error }

/** A client whose stream replays scripted turns and records every request. */
function fakeClient(turns: Turn[]) {
  const requests: BetaMessageStreamParams[] = []
  const client: AgentClient = {
    beta: {
      messages: {
        stream(body) {
          requests.push(structuredClone(body))
          const turn = turns.shift()
          if (!turn) throw new Error('no more scripted turns')
          const listeners: { text: ((d: string) => void)[]; streamEvent: ((e: BetaRawMessageStreamEvent) => void)[] } = { text: [], streamEvent: [] }
          const stream: StreamLike = {
            on(event: 'text' | 'streamEvent', listener: (value: never) => void) {
              listeners[event].push(listener as never)
              return stream
            },
            async finalMessage() {
              if (turn.throws) throw turn.throws
              turn.content.forEach((block, index) => {
                const b = block as { type: string; text?: string }
                listeners.streamEvent.forEach((l) => l({ type: 'content_block_start', index, content_block: block } as BetaRawMessageStreamEvent))
                if (b.type === 'text' && b.text) listeners.text.forEach((l) => l(b.text as string))
              })
              return { id: 'msg', type: 'message', role: 'assistant', model: body.model, content: turn.content, stop_reason: turn.stop_reason } as unknown as BetaMessage
            },
            abort() {},
          }
          return stream
        },
      },
    },
  }
  return { client, requests }
}

function fakeHost(): ToolHost {
  const browser: Browser = {
    activeTab: async () => ({ id: 1, url: 'https://www.citapreviadnie.es/citaPreviaDni/', title: 'Cita' }),
    frames: async () => [0],
    page: vi.fn(async (_tab: number, request: { op: string }) => request.op === 'point' ? { ok: true } : ({ url: 'https://www.citapreviadnie.es/citaPreviaDni/', title: 'Cita', outline: '[e1] link "CONTINUAR" {nav}', elements: 1, matched: true, busy: false, classes: { e1: 'nav' } })) as Browser['page'],
    navigate: async (_id, url) => ({ id: 1, url, title: 'Abierta' }),
  }
  return { browser, ask: async () => 'Sí', approveSite: async () => false, approvedHosts: () => [], wait: async () => {} }
}

function events(): AgentEvents & { log: string[] } {
  const log: string[] = []
  return {
    log,
    text: (delta) => log.push(`text:${delta}`),
    toolStart: (_id, name) => log.push(`start:${name}`),
    toolEnd: (_id, name, outcome) => log.push(`end:${name}:${outcome.isError ? 'error' : 'ok'}`),
    sources: (found) => log.push(`sources:${found.length}`),
  }
}

const toolUse = (id: string, name: string, input: unknown) => ({ type: 'tool_use', id, name, input })

describe('requestParams', () => {
  it('uses the frozen system prompt, all tools, prompt caching, effort and server-side fallbacks', () => {
    const params = requestParams('claude-opus-5-5', 'medium', [])
    expect(params.system).toBe(SYSTEM_PROMPT)
    expect(params.tools).toBe(TOOLS)
    expect(params.cache_control).toEqual({ type: 'ephemeral' })
    expect(params.output_config).toEqual({ effort: 'medium' })
    expect(params.betas).toEqual(['server-side-fallback-2026-07-01'])
    expect(params.fallbacks).toBe('default')
    expect(params).not.toHaveProperty('thinking')
    expect(params).not.toHaveProperty('tool_choice')
    expect(TOOLS.map((t) => (t as { name: string }).name)).toContain('web_search')
  })

  it('sends no fallbacks for Haiku', () => {
    const params = requestParams('claude-haiku-5-5', 'low', [])
    expect(params).not.toHaveProperty('fallbacks')
    expect(params).not.toHaveProperty('betas')
  })

  it('keeps the system prompt free of volatile content', () => {
    expect(SYSTEM_PROMPT).not.toMatch(/\d{4}-\d{2}-\d{2}T|Date|undefined/)
  })
})

describe('runTurn', () => {
  it('runs tools, sends every result back in one message, and keeps the assistant content unchanged', async () => {
    const thinking = { type: 'thinking', thinking: '', signature: 'sig' }
    const { client, requests } = fakeClient([
      { content: [thinking, toolUse('t1', 'find_procedure', { query: 'renovar dni' }), toolUse('t2', 'read_page', {})], stop_reason: 'tool_use' },
      { content: [{ type: 'text', text: 'Vamos a pedir la cita.' }], stop_reason: 'end_turn' },
    ])
    const history: BetaMessageParam[] = [{ role: 'user', content: 'Quiero renovar el DNI' }]
    const ev = events()
    const result = await runTurn({ client, model: 'claude-opus-5-5', effort: 'medium', history, host: fakeHost(), state: new ToolState(), events: ev })
    expect(result).toEqual({ stop: 'end_turn', pointed: false })
    expect(history).toHaveLength(4)
    expect(history[1]).toEqual({ role: 'assistant', content: [thinking, toolUse('t1', 'find_procedure', { query: 'renovar dni' }), toolUse('t2', 'read_page', {})] })
    const results = history[2]?.content as { type: string; tool_use_id: string; is_error?: boolean }[]
    expect(results.map((r) => [r.type, r.tool_use_id, r.is_error ?? false])).toEqual([
      ['tool_result', 't1', false],
      ['tool_result', 't2', false],
    ])
    expect(requests[1]?.messages).toHaveLength(3)
    expect(ev.log).toEqual(['start:find_procedure', 'end:find_procedure:ok', 'start:read_page', 'end:read_page:ok', 'text:Vamos a pedir la cita.'])
  })

  it('answers an invalid tool input with an error result instead of running it', async () => {
    const host = fakeHost()
    const { client } = fakeClient([
      { content: [toolUse('t1', 'click', { ref: 'e1' })], stop_reason: 'tool_use' },
      { content: [{ type: 'text', text: 'Perdona.' }], stop_reason: 'end_turn' },
    ])
    const history: BetaMessageParam[] = [{ role: 'user', content: 'sigue' }]
    await runTurn({ client, model: 'claude-opus-5-5', effort: 'medium', history, host, state: new ToolState(), events: events() })
    const [first] = history[2]?.content as { is_error?: boolean; content: string }[]
    expect(first?.is_error).toBe(true)
    expect(first?.content).toContain('INVALID_JSON')
    expect(host.browser.page).not.toHaveBeenCalled()
  })

  it('never runs tools from a refused or truncated turn', async () => {
    for (const stop_reason of ['refusal', 'max_tokens'] as const) {
      const host = fakeHost()
      const { client } = fakeClient([{ content: [toolUse('t1', 'read_page', {})], stop_reason }])
      const history: BetaMessageParam[] = [{ role: 'user', content: 'hola' }]
      const result = await runTurn({ client, model: 'claude-opus-5-5', effort: 'medium', history, host, state: new ToolState(), events: events() })
      expect(result.stop).toBe(stop_reason)
      expect(history).toHaveLength(1)
      expect(host.browser.page).not.toHaveBeenCalled()
    }
  })

  it('reports point_to so the panel can show «Hecho, sigue»', async () => {
    const { client } = fakeClient([
      { content: [toolUse('t1', 'read_page', {})], stop_reason: 'tool_use' },
      { content: [toolUse('t2', 'point_to', { ref: 'e1', instruction: 'Pulsa CONTINUAR' })], stop_reason: 'tool_use' },
      { content: [{ type: 'text', text: 'Pulsa CONTINUAR.' }], stop_reason: 'end_turn' },
    ])
    const result = await runTurn({ client, model: 'claude-sonnet-5-5', effort: 'low', history: [{ role: 'user', content: 'hola' }], host: fakeHost(), state: new ToolState(), events: events() })
    expect(result).toEqual({ stop: 'end_turn', pointed: true })
  })

  it('shows web searches while they run, closes them with the query, and passes on the pages found', async () => {
    const search = { type: 'server_tool_use', id: 'srv1', name: 'web_search', input: { query: 'empadronamiento valencia sede' } }
    const results = { type: 'web_search_tool_result', tool_use_id: 'srv1', content: [{ type: 'web_search_result', title: 'Sede', url: 'https://sede.valencia.es/', encrypted_content: 'x' }] }
    const { client } = fakeClient([{ content: [search, results, { type: 'text', text: 'He encontrado la sede.' }], stop_reason: 'end_turn' }])
    const ev = events()
    await runTurn({ client, model: 'claude-opus-5-5', effort: 'medium', history: [{ role: 'user', content: 'empadronarme' }], host: fakeHost(), state: new ToolState(), events: ev })
    expect(ev.log).toEqual(['start:web_search', 'text:He encontrado la sede.', 'end:web_search:ok', 'sources:1'])
  })

  it('continues a paused turn by sending the assistant content back', async () => {
    const { client, requests } = fakeClient([
      { content: [{ type: 'server_tool_use', id: 's', name: 'web_search', input: { query: 'x' } }], stop_reason: 'pause_turn' },
      { content: [{ type: 'text', text: 'Listo.' }], stop_reason: 'end_turn' },
    ])
    const history: BetaMessageParam[] = [{ role: 'user', content: 'busca' }]
    await runTurn({ client, model: 'claude-opus-5-5', effort: 'medium', history, host: fakeHost(), state: new ToolState(), events: events() })
    expect(requests).toHaveLength(2)
    expect(requests[1]?.messages.at(-1)?.role).toBe('assistant')
  })

  it('re-issues a turn whose tool input could not be parsed, but surfaces API errors', async () => {
    const { client, requests } = fakeClient([
      { content: [], stop_reason: 'end_turn', throws: new Error('Unable to parse tool parameter JSON') },
      { content: [{ type: 'text', text: 'Hola.' }], stop_reason: 'end_turn' },
    ])
    await runTurn({ client, model: 'claude-opus-5-5', effort: 'medium', history: [{ role: 'user', content: 'hola' }], host: fakeHost(), state: new ToolState(), events: events() })
    expect(requests).toHaveLength(2)

    const apiError = new Anthropic.APIError(401, { type: 'error' }, 'invalid x-api-key', new Headers())
    const failing = fakeClient([{ content: [], stop_reason: 'end_turn', throws: apiError }])
    await expect(
      runTurn({ client: failing.client, model: 'claude-opus-5-5', effort: 'medium', history: [{ role: 'user', content: 'hola' }], host: fakeHost(), state: new ToolState(), events: events() }),
    ).rejects.toBe(apiError)
  })

  it('stops when aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    const { client, requests } = fakeClient([])
    const result = await runTurn({ client, model: 'claude-opus-5-5', effort: 'medium', history: [], host: fakeHost(), state: new ToolState(), events: events(), signal: controller.signal })
    expect(result.stop).toBe('aborted')
    expect(requests).toHaveLength(0)
  })
})
