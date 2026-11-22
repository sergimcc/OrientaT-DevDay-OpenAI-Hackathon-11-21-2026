import { useCallback, useEffect, useRef, useState } from 'react'
import { scribeUrl, speechText, type SpokenReply } from './speech'

export type VoiceStatus = 'idle' | 'connecting' | 'connected'
export type VoiceError = 'unavailable' | 'permission' | 'timeout' | 'connection' | 'response' | 'disconnected'
export type VoiceLevels = { input: number; output: number }
export type SpeechOptions = {
  onText: (text: string) => void | Promise<void>
  replies: SpokenReply[]
  busy: boolean
  onGreeting: (text: string) => void
}
const SILENT = { input: 0, output: 0 }
const GREETING = 'Hola, ¿qué trámite necesitas?'

/** Audio is an input/output adapter for the existing chat, never a second agent. */
export function useSpeech(options: SpeechOptions, api: string, worklet: string, onPermission?: () => void, microphoneAllowed?: () => Promise<boolean>) {
  const callbacks = useRef(options)
  useEffect(() => { callbacks.current = options }, [options])
  const active = useRef<{ dispose: () => void; speak: (text: string) => void } | null>(null)
  const meter = useRef<() => VoiceLevels>(() => SILENT)
  const seen = useRef(new Set<string>())
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [error, setError] = useState<VoiceError | null>(null)
  const [pending, setPending] = useState<string[]>([])
  const [partial, setPartial] = useState('')
  const sending = useRef(false)
  const getLevels = useCallback(() => meter.current(), [])

  const stop = useCallback(() => {
    active.current?.dispose()
    setStatus('idle')
    setError(null)
    setPartial('')
    setPending([])
  }, [])
  useEffect(() => () => {
    active.current?.dispose()
    // Fast Refresh also runs cleanup: don't leave a disconnected call labelled as connected.
    setStatus('idle')
    setPartial('')
    setPending([])
  }, [])

  useEffect(() => {
    if (status !== 'connected' || options.busy || sending.current || !pending.length) return
    const text = pending[0]!
    const session = active.current
    sending.current = true
    setPending(queue => queue.slice(1))
    void Promise.resolve().then(() => {
      if (active.current === session) return callbacks.current.onText(text)
    }).catch(() => { if (active.current === session) setError('response') }).finally(() => {
      sending.current = false
      setPending(queue => [...queue])
    })
  }, [status, options.busy, pending])

  useEffect(() => {
    if (status !== 'connected' || pending.length || !active.current) return
    for (const reply of options.replies) {
      if (seen.current.has(reply.id) || (!reply.ready && options.busy) || !reply.text.trim()) continue
      seen.current.add(reply.id)
      active.current.speak(reply.text)
    }
  }, [status, options.replies, options.busy, pending.length])

  const start = useCallback(async () => {
    if (active.current) return
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === 'undefined') { setError('unavailable'); return }
    const abort = new AbortController()
    let audio: AudioContext | undefined
    let mic: MediaStream | undefined
    let capture: AudioWorkletNode | undefined
    let socket: WebSocket | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined
    let source: AudioBufferSourceNode | undefined
    let tts: AbortController | undefined
    let output: GainNode | undefined
    let speechQueue = Promise.resolve()
    let speechGeneration = 0
    let ready = false
    let outputPlaying = false
    let listenAfter = 0
    const interrupt = () => {
      speechGeneration++
      tts?.abort()
      source?.stop()
      source = undefined
      outputPlaying = false
      speechQueue = Promise.resolve()
    }
    const dispose = () => {
      abort.abort()
      clearTimeout(timeout)
      interrupt()
      mic?.getTracks().forEach(track => track.stop())
      capture?.disconnect()
      capture?.port.close()
      socket?.close()
      if (audio && audio.state !== 'closed') void audio.close()
      active.current = null
      meter.current = () => SILENT
    }
    const fail = (reason: VoiceError) => {
      if (abort.signal.aborted) return
      dispose()
      setStatus('idle'); setPartial(''); setPending([]); setError(reason)
    }
    const speak = (raw: string) => {
      const text = speechText(raw)
      if (!text) return
      const generation = speechGeneration
      speechQueue = speechQueue.then(async () => {
        if (abort.signal.aborted || generation !== speechGeneration || !audio || !output) return
        const request = new AbortController()
        tts = request
        try {
          const response = await fetch(`${api}/speak`, {
            method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ text }),
            signal: AbortSignal.any([abort.signal, request.signal]),
          })
          if (!response.ok) throw new Error('Speech failed')
          const buffer = await audio.decodeAudioData(await response.arrayBuffer())
          if (abort.signal.aborted || generation !== speechGeneration) return
          // Browsers may suspend output after a tab has been in the background.
          if (audio.state === 'suspended') await audio.resume()
          if (abort.signal.aborted || generation !== speechGeneration) return
          const node = audio.createBufferSource()
          node.buffer = buffer
          node.connect(output)
          source = node
          outputPlaying = true
          setPartial('')
          await new Promise<void>(resolve => {
            node.onended = () => {
              node.disconnect()
              if (source === node) {
                source = undefined
                outputPlaying = false
                // Let acoustic echo and in-flight transcription events drain before listening again.
                listenAfter = Date.now() + 600
              }
              resolve()
            }
            node.start()
          })
        } catch {
          if (!abort.signal.aborted && !request.signal.aborted) setError('response')
        }
      })
    }
    active.current = { dispose, speak }
    seen.current = new Set(callbacks.current.replies.map(reply => reply.id))
    setStatus('connecting')
    timeout = setTimeout(() => fail('timeout'), 25000)
    try {
      audio = new AudioContext({ sampleRate: 24000 })
      const resumed = audio.resume().then(() => true, () => false)
      // Side panels cannot show a microphone prompt: ask in a tab before getUserMedia can hang.
      if (microphoneAllowed && !await microphoneAllowed()) {
        if (!abort.signal.aborted) { onPermission?.(); fail('permission') }
        return
      }
      abort.signal.throwIfAborted()
      mic = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } })
      if (abort.signal.aborted) { mic.getTracks().forEach(track => track.stop()); return }
      if (!await resumed || audio.sampleRate !== 24000) throw new Error('Audio incompatible')
      await audio.audioWorklet.addModule(worklet)
      abort.signal.throwIfAborted()
      const response = await fetch(`${api}/session`, { method: 'POST', signal: abort.signal })
      const { token } = await response.json() as { token?: string }
      if (!response.ok || !token) throw new Error('No transcription token')
      abort.signal.throwIfAborted()
      socket = new WebSocket(scribeUrl(token))
      const connection = socket
      capture = new AudioWorkletNode(audio, 'voice-capture', { channelCount: 1 })
      capture.port.onmessage = ({ data }: MessageEvent<ArrayBuffer>) => {
        if (!ready || connection.readyState !== WebSocket.OPEN) return
        if (connection.bufferedAmount > 256 * 1024) { fail('connection'); return }
        // Keep the transcription connection alive with silence while reading. Otherwise loudspeakers
        // feed the answer back into the microphone, which used to cancel its own playback.
        const bytes = outputPlaying || Date.now() < listenAfter ? new Uint8Array(data.byteLength) : new Uint8Array(data)
        connection.send(JSON.stringify({ message_type: 'input_audio_chunk', audio_base_64: btoa(String.fromCharCode(...bytes)), sample_rate: 24000 }))
      }
      const input = audio.createMediaStreamSource(mic)
      const inputMeter = audio.createAnalyser()
      const outputMeter = audio.createAnalyser()
      inputMeter.fftSize = outputMeter.fftSize = 512
      input.connect(inputMeter)
      input.connect(capture)
      const silent = audio.createGain(); silent.gain.value = 0
      capture.connect(silent).connect(audio.destination)
      output = audio.createGain()
      output.connect(outputMeter)
      output.connect(audio.destination)
      const samples = new Float32Array(512)
      const level = (analyser: AnalyserNode) => {
        analyser.getFloatTimeDomainData(samples)
        return Math.min(1, Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length) * 4)
      }
      meter.current = () => ({ input: level(inputMeter), output: level(outputMeter) })
      connection.onmessage = ({ data }) => {
        if (abort.signal.aborted) return
        const event = JSON.parse(data) as { message_type: string; text?: string; error?: string }
        if (event.message_type === 'session_started') {
          ready = true
          clearTimeout(timeout)
          setStatus('connected')
          callbacks.current.onGreeting(GREETING)
        } else if (event.message_type === 'partial_transcript' && event.text?.trim()) {
          if (!outputPlaying && Date.now() >= listenAfter) setPartial(event.text)
        } else if (event.message_type === 'committed_transcript') {
          setPartial('')
          if (!outputPlaying && Date.now() >= listenAfter && event.text?.trim()) { interrupt(); setPending(queue => [...queue, event.text!.trim()]) }
        } else if (event.error || event.message_type.endsWith('_error')) fail('connection')
      }
      connection.onerror = () => fail('connection')
      connection.onclose = () => fail('disconnected')
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'NotAllowedError') { onPermission?.(); fail('permission') }
      else fail('connection')
    }
  }, [api, worklet, onPermission, microphoneAllowed])
  return { status, error, partial, start, stop, getLevels }
}
