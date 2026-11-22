import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { build } from 'esbuild'
import { JSDOM } from 'jsdom'

let bundle: string
const pages: JSDOM[] = []
beforeAll(async () => {
  const result = await build({ stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
    import React, { useEffect, useState } from 'react';
    import { createRoot } from 'react-dom/client';
    import { useSpeech } from './src/voice/use-speech';
    function App() {
      const [replies, setReplies] = useState([{id:'old',text:'Old answer'}]);
      const [busy,setBusy] = useState(false);
      const voice = useSpeech({busy, replies,
        onText: text => { window.inputs.push(text); setBusy(true); window.complete = () => {setReplies(r=>[...r,{id:text,text:'Chat: '+text}]);setBusy(false)}; },
        onGreeting: text => setReplies(r=>[...r,{id:'greeting',text}]),
      }, '/api/voice','capture.js', () => {window.permissionRequests++}, async () => window.allowed !== false);
      useEffect(()=>{window.voice=voice});
      return <div>{voice.status}</div>;
    }
    createRoot(document.getElementById('root')).render(<App/>);
  ` }, bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"production"' } })
  bundle = result.outputFiles![0]!.text
})
afterEach(() => { for (const page of pages.splice(0)) page.window.close() })

describe('voice through the existing chat', () => {
  it('submits committed speech once, reads the chat reply, and drops queued input on hangup', async () => {
    const page = new JSDOM('<div id="root"></div>', { url:'http://localhost',runScripts:'outside-only',pretendToBeVisual:true })
    pages.push(page)
    const tracks = [{ stop: vi.fn() }]
    const node = () => ({connect:()=>node(), disconnect(){}, gain:{value:1}, fftSize:512, getFloatTimeDomainData(values: Float32Array){values.fill(0)}, port:{close(){},onmessage:null}})
    let socket: { onmessage?: (event: {data:string}) => void; close: ReturnType<typeof vi.fn> } | undefined
    const fetcher = vi.fn(async (url: string) => url.endsWith('/session') ? new Response(JSON.stringify({token:'temporary'})) : new Response(new Uint8Array([1])))
    const play = vi.fn()
    const stopAudio = vi.fn()
    let emitEcho = () => {}
    let now = 1000
    page.window.Date.now = () => now
    class Audio {
      sampleRate=24000; state='running'; destination=node(); audioWorklet={addModule:async()=>{}}
      resume=async()=>{}; close=async()=>{this.state='closed'}
      createGain=node; createAnalyser=node; createMediaStreamSource=node
      decodeAudioData=async()=>({})
      createBufferSource(){ const n = {...node(),buffer:null,onended:()=>{},start(){play();emitEcho();queueMicrotask(()=>n.onended())},stop(){stopAudio();n.onended()}};return n }
    }
    Object.assign(page.window, {inputs:[],permissionRequests:0,fetch:fetcher,AbortController,AbortSignal,AudioContext:Audio,AudioWorkletNode:class {constructor(){return node()}},WebSocket:class {
      static OPEN=1;readyState=1;bufferedAmount=0;close=vi.fn();send=vi.fn(); constructor(){socket=this}
    }})
    const getUserMedia = vi.fn(async()=>({getTracks:()=>tracks}))
    Object.defineProperty(page.window.navigator,'mediaDevices',{value:{getUserMedia}})
    page.window.eval(bundle)
    const w = page.window as unknown as { voice:{start:()=>Promise<void>;stop:()=>void};inputs:string[];complete:()=>void;allowed:boolean;permissionRequests:number }
    await vi.waitFor(()=>expect(w.voice).toBeDefined())
    await w.voice.start()
    const event = (message_type:string,text?:string)=>socket!.onmessage!({data:JSON.stringify({message_type,text})})
    emitEcho = () => { event('partial_transcript', 'Eco de la respuesta'); event('committed_transcript', 'Eco de la respuesta') }
    event('session_started')
    await vi.waitFor(()=>expect(fetcher.mock.calls.some(([url])=>url.endsWith('/speak'))).toBe(true))
    await vi.waitFor(()=>expect(play).toHaveBeenCalledTimes(1))
    expect(stopAudio).not.toHaveBeenCalled()
    now += 1000
    event('partial_transcript','Necesito')
    expect(w.inputs).toEqual([])
    event('committed_transcript','Necesito el DNI')
    await vi.waitFor(()=>expect(w.inputs).toEqual(['Necesito el DNI']))
    // Another phrase arriving while the chat is busy must not permanently discard its spoken answer.
    event('committed_transcript','Siguiente turno')
    w.complete()
    await vi.waitFor(()=>expect(w.inputs).toHaveLength(2))
    w.complete()
    await vi.waitFor(()=>expect(fetcher.mock.calls.filter(([url])=>url.endsWith('/speak')).length).toBe(3))
    await vi.waitFor(()=>expect(play).toHaveBeenCalledTimes(3))
    const calls = fetcher.mock.calls as unknown as [string,RequestInit][]
    expect(calls.filter(([url])=>url.endsWith('/speak')).map(([,init])=>JSON.parse(init.body as string).text)).toEqual(['Hola, ¿qué trámite necesitas?','Chat: Necesito el DNI','Chat: Siguiente turno'])
    expect(stopAudio).not.toHaveBeenCalled()
    now += 1000
    event('committed_transcript','Otro turno')
    await vi.waitFor(()=>expect(w.inputs).toHaveLength(3))
    event('committed_transcript','Entrada pendiente')
    w.voice.stop()
    w.complete()
    await new Promise(resolve=>setTimeout(resolve,30))
    expect(w.inputs).toHaveLength(3)
    expect(tracks[0]!.stop).toHaveBeenCalled()
    expect(socket!.close).toHaveBeenCalled()
    w.allowed = false
    await w.voice.start()
    expect(w.permissionRequests).toBe(1)
    expect(getUserMedia).toHaveBeenCalledTimes(1)
  })
})
