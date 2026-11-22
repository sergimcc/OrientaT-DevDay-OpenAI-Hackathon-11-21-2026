import type { BetaMessage } from '@anthropic-ai/sdk/resources/beta/messages/messages'
import type { AgentClient } from './agent'
import type { ExtensionReply } from './openaiProtocol'

/** An error from the local server (missing key, OpenAI rejected it, quota). Shown as is; never retried. */
export class LocalApiError extends Error {}

/** The local development server (web/, npm run dev), which holds the OpenAI key in web/.env.local. */
export const LOCAL_API = 'http://127.0.0.1:5173/api/extension'

/**
 * The agent client for OpenAI. The panel never sees the secret: it posts the same request it would send
 * to Claude to the local endpoint, which adapts it to the Responses API (src/agent/openaiProtocol.ts).
 * The reply arrives whole, not streamed, so `text` fires once per message.
 */
export function createLocalClient(): AgentClient {
  return { beta: { messages: { stream(body, options) {
    const controller = new AbortController()
    const signal = options?.signal ? AbortSignal.any([options.signal, controller.signal]) : controller.signal
    let onText = (_text: string) => {}
    return {
      on(event: 'text' | 'streamEvent', listener: (value: never) => void) {
        // No stream events: OpenAI's searches run inside the request and are not shown as rows.
        if (event === 'text') onText = listener as (text: string) => void
      },
      abort() { controller.abort() },
      async finalMessage() {
        let response: Response
        try {
          response = await fetch(LOCAL_API, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, signal,
            body: JSON.stringify({ system: body.system, messages: body.messages, tools: body.tools }),
          })
        } catch (error) {
          if (signal.aborted) throw error
          throw new LocalApiError('No se puede conectar con el servidor local. Ejecuta npm run dev en la carpeta web.')
        }
        if (!response.ok) throw new LocalApiError(await response.text())
        const result = await response.json() as ExtensionReply
        for (const part of result.content) if (part.type === 'text') onText(part.text)
        // The loop reads only `content` and `stop_reason`, which ExtensionReply carries in Claude's shape.
        return result as unknown as BetaMessage
      },
    }
  } } } }
}
