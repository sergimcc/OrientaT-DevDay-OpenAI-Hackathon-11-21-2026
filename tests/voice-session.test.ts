import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { voiceSession } from '../web/server/voice'

type Handler = (request: IncomingMessage, response: ServerResponse) => void

function handler(apiKey = 'eleven-secret', route = 'session'): Handler {
  let use: Handler | undefined
  const plugin = voiceSession(apiKey, 'brian') as { configureServer: (server: unknown) => void }
  plugin.configureServer({ middlewares: { use: (path: string, fn: Handler) => { if (path === `/api/voice/${route}`) use = fn } } })
  return use!
}

function call(origin: string | undefined, route = 'session', body?: unknown): Promise<{ status: number; body: { token?: string; error?: string }; headers: Record<string, string> }> {
  return new Promise((done) => {
    const stream = new PassThrough()
    const request = Object.assign(stream, { method: 'POST', headers: { host: '127.0.0.1:5173', ...(origin ? { origin } : {}) } }) as unknown as IncomingMessage
    stream.end(body === undefined ? undefined : JSON.stringify(body))
    const headers: Record<string, string> = {}
    const response = Object.assign(new EventEmitter(), {
      setHeader: (name: string, value: string) => { headers[name.toLowerCase()] = value },
      writeHead: (status: number, values: Record<string, string>) => { (response as unknown as { status: number }).status = status; Object.assign(headers, values) },
      end: (text: string) => done({ status: (response as unknown as { status: number }).status, body: headers['Content-Type'] === 'audio/mpeg' ? text : JSON.parse(text), headers }),
    }) as unknown as ServerResponse
    handler('eleven-secret', route)(request, response)
  })
}

describe('voice session for the extension', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('hands a session token to the side panel, and nothing to other sites', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ token: 'short-lived' }))))
    const fromPanel = await call('chrome-extension://abcdefghijklmnopabcdefghijklmnop')
    expect(fromPanel.status).toBe(200)
    expect(fromPanel.body).toEqual({ token: 'short-lived' })
    expect(fromPanel.headers['access-control-allow-origin']).toBe('chrome-extension://abcdefghijklmnopabcdefghijklmnop')
    expect((await call('http://127.0.0.1:5173')).status).toBe(200)
    expect((await call('https://evil.example')).status).toBe(403)
    expect((await call(undefined)).status).toBe(403)
  })
})


describe('speech adapter, without a second conversational agent', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('issues a transcription-only token', async () => {
    const upstream = vi.fn(async () => new Response(JSON.stringify({ token: 'temporary' })))
    vi.stubGlobal('fetch', upstream)
    expect((await call('http://127.0.0.1:5173')).status).toBe(200)
    expect((upstream.mock.calls as unknown as [string][])[0]?.[0]).toBe('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe')
  })

  it('synthesizes the supplied chat answer without instructions or an agent session', async () => {
    const upstream = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])))
    vi.stubGlobal('fetch', upstream)
    const result = await call('http://127.0.0.1:5173', 'speak', { text: 'Esta es la respuesta del chat.' })
    expect(result.status).toBe(200)
    const calls = upstream.mock.calls as unknown as [string, RequestInit][]
    expect(calls[0]?.[0]).toContain('/v1/text-to-speech/')
    expect(JSON.parse(calls[0]![1].body as string)).toEqual({ text: 'Esta es la respuesta del chat.', model_id: 'eleven_v4' })
  })

  it('rejects empty text and foreign origins before contacting the provider', async () => {
    const upstream = vi.fn()
    vi.stubGlobal('fetch', upstream)
    expect((await call('http://127.0.0.1:5173', 'speak', { text: '' })).status).toBe(400)
    expect((await call('https://evil.example', 'speak', { text: 'Hola' })).status).toBe(403)
    expect(upstream).not.toHaveBeenCalled()
  })
})
