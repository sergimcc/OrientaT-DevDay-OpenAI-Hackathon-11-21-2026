import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

/** Speech only. Reasoning and tools stay in /api/chat and the extension's runTurn. */
export function voiceSession(apiKey: string | undefined, voiceId: string, ttsModel = 'eleven_v4'): Plugin {
  return {
    name: 'local-voice-session',
    configureServer(server) {
      for (const route of ['session', 'speak']) {
        server.middlewares.use(`/api/voice/${route}`, (request, response) => {
          void handle(request, response, apiKey, voiceId, ttsModel, route === 'speak')
        })
      }
    },
  }
}

async function handle(request: IncomingMessage, response: ServerResponse, apiKey: string | undefined, voiceId: string, model: string, speak: boolean) {
  const json = (status: number, data: unknown) => {
    response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    response.end(JSON.stringify(data))
  }
  const host = request.headers.host ?? ''
  const origin = request.headers.origin
  const extension = !!origin && /^chrome-extension:\/\/[a-p]{32}$/.test(origin)
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host) || (origin !== `http://${host}` && !extension)) {
    json(403, { error: 'Origen no permitido.' }); return
  }
  if (extension) {
    response.setHeader('Access-Control-Allow-Origin', origin!)
    response.setHeader('Vary', 'Origin')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  }
  if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return }
  if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); json(405, { error: 'Usa POST.' }); return }
  if (!apiKey) { json(503, { error: 'Falta ELEVENLABS_API_KEY en el servidor.' }); return }
  let text = ''
  if (speak) {
    try {
      let size = 0
      const chunks: Buffer[] = []
      for await (const chunk of request) {
        const buffer = Buffer.from(chunk)
        size += buffer.length
        if (size > 64000) { json(413, { error: 'Texto demasiado largo.' }); return }
        chunks.push(buffer)
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      if (typeof body.text !== 'string' || !body.text.trim() || body.text.length > 12000) throw new Error('Invalid text')
      text = body.text
    } catch { json(400, { error: 'Texto no válido.' }); return }
  }
  const controller = new AbortController()
  response.once('close', () => controller.abort())
  try {
    const url = speak
      ? `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`
      : 'https://api.elevenlabs.io/v1/single-use-token/realtime_scribe'
    const upstream = await fetch(url, {
      method: 'POST', headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]),
      ...(speak ? { body: JSON.stringify({ text, model_id: model }) } : {}),
    })
    if (!upstream.ok) {
      console.error(`ElevenLabs rechazó ${speak ? 'la lectura' : 'la transcripción'} (${upstream.status}).`)
      await upstream.body?.cancel()
      json(502, { error: 'No se pudo iniciar el servicio de voz.' }); return
    }
    if (speak) {
      const audio = Buffer.from(await upstream.arrayBuffer())
      response.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' })
      response.end(audio)
    } else {
      const data = await upstream.json() as { token?: string }
      if (!data.token) { json(502, { error: 'No se recibió un token de transcripción.' }); return }
      json(200, { token: data.token })
    }
  } catch {
    if (!controller.signal.aborted) json(502, { error: 'No se pudo conectar con ElevenLabs.' })
  }
}
