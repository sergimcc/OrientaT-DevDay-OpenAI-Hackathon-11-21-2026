import Anthropic from '@anthropic-ai/sdk'
import type {
  BetaContentBlockParam,
  BetaMessage,
  BetaMessageParam,
  BetaRawMessageStreamEvent,
  BetaMessageStreamParams,
  BetaToolResultBlockParam,
  BetaToolUnion,
  BetaWebSearchTool20260209,
} from '@anthropic-ai/sdk/resources/beta/messages/messages'
import { SYSTEM_PROMPT } from './prompt'
import { TOOL_DEFS, runTool } from './tools'
import type { ToolHost, ToolOutcome, ToolState } from './tools'
import { LocalApiError } from './localClient'

// The agent loop, run in the side panel with the person's own API key. It streams one model turn, runs
// the tools it asked for, sends the results back, and repeats until the model ends its turn.
//
// Besides the extension's own tools, the model has Claude's web search (a server tool: it runs on
// Anthropic's side, inside the same request) to discover the official page for procedures the site maps
// do not cover. Search results never give it any power on a page: opening an unknown site still needs
// the person's approval (open_page), and the click rules are the same everywhere.

export type ModelId = 'claude-opus-5-5' | 'claude-sonnet-5-5' | 'claude-haiku-5-5'
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

/** The part of a message stream the loop uses. The SDK's BetaMessageStream has it; the tests fake it. */
export type StreamLike = {
  on(event: 'text', listener: (delta: string) => void): unknown
  on(event: 'streamEvent', listener: (event: BetaRawMessageStreamEvent) => void): unknown
  finalMessage(): Promise<BetaMessage>
  abort(): void
}
export type AgentClient = { beta: { messages: { stream(body: BetaMessageStreamParams, options?: { signal?: AbortSignal }): StreamLike } } }

export type AgentEvents = {
  /** A piece of the assistant's visible text. `turn` changes with each model message. */
  text(delta: string, turn: number): void
  toolStart(id: string, name: string, input: unknown): void
  toolEnd(id: string, name: string, outcome: ToolOutcome): void
  /** Pages the model found with web search this turn (title and url), to show as sources. */
  sources?(found: { title: string; url: string }[]): void
}

/** Claude's web search, run server-side. Spanish results first; a few searches per turn at most. */
export const WEB_SEARCH: BetaWebSearchTool20260209 = {
  type: 'web_search_20260209',
  name: 'web_search',
  max_uses: 5,
  user_location: { type: 'approximate', country: 'ES' },
}

export const TOOLS: BetaToolUnion[] = [...TOOL_DEFS, WEB_SEARCH]

export type TurnResult = { stop: 'end_turn' | 'refusal' | 'max_tokens' | 'aborted' | 'too_many_steps'; pointed: boolean }

export function createClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

/** Opus and Sonnet 5.5 can be declined by safety classifiers; the server retries on its default fallback. */
function fallbackParams(model: ModelId): Partial<BetaMessageStreamParams> {
  if (model === 'claude-haiku-5-5') return {}
  return { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }
}

export function requestParams(model: ModelId, effort: Effort, history: BetaMessageParam[]): BetaMessageStreamParams {
  return {
    model,
    max_tokens: 32_000,
    system: SYSTEM_PROMPT,
    tools: TOOLS,
    messages: history,
    // Caches the longest stable prefix (tools, system, the conversation so far) on every request.
    cache_control: { type: 'ephemeral' },
    output_config: { effort },
    ...fallbackParams(model),
  }
}

/** Closes the search rows opened while streaming, with the query used, and passes on the pages found. */
function reportSearches(message: BetaMessage, events: AgentEvents): void {
  const found: { title: string; url: string }[] = []
  for (const block of message.content) {
    if (block.type === 'server_tool_use' && block.name === 'web_search') {
      const query = typeof (block.input as { query?: unknown })?.query === 'string' ? (block.input as { query: string }).query : ''
      const result = message.content.find((b) => b.type === 'web_search_tool_result' && b.tool_use_id === block.id)
      const failed = !result || result.type !== 'web_search_tool_result' || !Array.isArray(result.content)
      events.toolEnd(block.id, 'web_search', { content: query, isError: failed })
    }
    if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
      for (const hit of block.content) if (hit.type === 'web_search_result') found.push({ title: hit.title, url: hit.url })
    }
  }
  // OpenAI (src/agent/localClient.ts) reports its search citations next to the content, not as blocks.
  const cited = (message as { sources?: { title: string; url: string }[] }).sources
  if (Array.isArray(cited)) found.push(...cited)
  if (found.length) events.sources?.(found)
}

const MAX_STEPS = 30
const MAX_STREAM_RETRIES = 2

/**
 * Runs the model until it ends its turn. `history` is appended to in place: each assistant message
 * exactly as it came back (thinking blocks included), then one user message with every tool result.
 */
export async function runTurn(opts: {
  client: AgentClient
  model: ModelId
  effort: Effort
  history: BetaMessageParam[]
  host: ToolHost
  state: ToolState
  events: AgentEvents
  signal?: AbortSignal
}): Promise<TurnResult> {
  const { client, model, effort, history, host, state, events, signal } = opts
  let pointed = false
  let retries = 0
  for (let step = 0; step < MAX_STEPS; step++) {
    if (signal?.aborted) return { stop: 'aborted', pointed }
    let message: BetaMessage
    const stream = client.beta.messages.stream(requestParams(model, effort, history), { signal })
    try {
      stream.on('text', (delta) => events.text(delta, step))
      // Searches run on the server inside this request: show them while they run.
      stream.on('streamEvent', (event) => {
        if (event.type !== 'content_block_start') return
        const block = event.content_block
        if (block.type === 'server_tool_use' && block.name === 'web_search') events.toolStart(block.id, 'web_search', block.input)
      })
      message = await stream.finalMessage()
    } catch (err) {
      if (signal?.aborted) return { stop: 'aborted', pointed }
      // API errors (auth, rate limit, overload) go to the panel. Anything else here is a tool input the
      // SDK could not parse; the block never completed, so the turn is re-issued, a couple of times at most.
      if (err instanceof Anthropic.APIError || err instanceof LocalApiError || retries >= MAX_STREAM_RETRIES) throw err
      retries += 1
      step -= 1
      continue
    }
    retries = 0
    reportSearches(message, events)
    const toolUses = message.content.filter((block) => block.type === 'tool_use')
    // A refusal can cut a tool call off mid-input, and max_tokens can truncate one: never run those.
    if (message.stop_reason === 'refusal') return { stop: 'refusal', pointed }
    if (message.stop_reason === 'max_tokens' && toolUses.length) return { stop: 'max_tokens', pointed }
    history.push({ role: 'assistant', content: message.content as unknown as BetaContentBlockParam[] })
    if (message.stop_reason === 'pause_turn') continue
    if (message.stop_reason !== 'tool_use' || !toolUses.length) return { stop: message.stop_reason === 'max_tokens' ? 'max_tokens' : 'end_turn', pointed }

    const results: BetaToolResultBlockParam[] = []
    for (const block of toolUses) {
      if (block.type !== 'tool_use') continue
      events.toolStart(block.id, block.name, block.input)
      let outcome: ToolOutcome
      if (signal?.aborted) outcome = { content: 'La persona ha detenido al asistente.', isError: true }
      else {
        try {
          outcome = await runTool(block.name, block.input, host, state)
        } catch (err) {
          outcome = { content: `Error: ${err instanceof Error ? err.message : String(err)}`, isError: true }
        }
      }
      pointed ||= !!outcome.pointed
      events.toolEnd(block.id, block.name, outcome)
      results.push({ type: 'tool_result', tool_use_id: block.id, content: outcome.content, ...(outcome.isError ? { is_error: true } : {}) })
    }
    // Every result in one message, so the model keeps making parallel calls when it wants to.
    history.push({ role: 'user', content: results })
    if (signal?.aborted) return { stop: 'aborted', pointed }
  }
  return { stop: 'too_many_steps', pointed }
}
