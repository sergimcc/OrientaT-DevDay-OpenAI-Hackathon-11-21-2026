import { useEffect, useRef } from 'react'
import type { VoiceLevels } from './voice'

// The website's voice orb (web/src/components/chat/voice-orb.tsx), styled with sidepanel.css instead of
// Tailwind. Idle, it drifts slowly; connecting, it breathes; live, it swells with whoever is talking.

type OrbState = 'idle' | 'connecting' | 'live'

// Brand red underneath; gold, orange and warm white lights drift over it.
const BLOBS = [
  { color: '255,229,0', orbit: 0.42, size: 0.95, speed: 0.9, offset: 0 },
  { color: '255,138,31', orbit: 0.5, size: 0.8, speed: -0.7, offset: 2.1 },
  { color: '255,77,109', orbit: 0.38, size: 0.85, speed: 0.55, offset: 4.2 },
  { color: '255,244,200', orbit: 0.3, size: 0.55, speed: -1.2, offset: 1.1 },
]

export function VoiceOrb({ size, state, getLevels }: { size: number; state: OrbState; getLevels?: () => VoiceLevels }) {
  const wrapper = useRef<HTMLSpanElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const element = wrapper.current
    const context = canvas.current?.getContext('2d')
    if (!element || !context) return

    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const pixels = Math.round(size * Math.min(window.devicePixelRatio || 1, 2))
    context.canvas.width = context.canvas.height = pixels
    const c = pixels / 2
    let level = 0
    let phase = 0
    let last = performance.now()
    let raf = 0

    const glow = (x: number, y: number, radius: number, from: string, to: string, inner = 0) => {
      const gradient = context.createRadialGradient(x, y, inner, x, y, radius)
      gradient.addColorStop(0, from)
      gradient.addColorStop(1, to)
      context.fillStyle = gradient
      context.fillRect(0, 0, pixels, pixels)
    }

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      let target = 0
      if (state === 'connecting') target = 0.3 + 0.2 * Math.sin(now / 220)
      else if (state === 'live' && getLevels) {
        const { input, output } = getLevels()
        target = Math.max(output, input * 0.8)
      }
      // Rise fast, fall slowly, so speech reads as a swell and not a flicker.
      level += (target - level) * Math.min(1, dt * (target > level ? 18 : 6))
      if (!still) phase += dt * (0.35 + level * 2.2)

      context.globalCompositeOperation = 'source-over'
      glow(c * 0.8, c * 0.7, c * 1.4, '#ff4a33', '#a80512')
      context.globalCompositeOperation = 'screen'
      for (const blob of BLOBS) {
        const angle = phase * blob.speed + blob.offset
        const orbit = blob.orbit * c * (1 + level * 0.5)
        glow(c + Math.cos(angle) * orbit, c + Math.sin(angle * 1.3) * orbit, blob.size * c * (1 + level * 0.35), `rgba(${blob.color},0.85)`, `rgba(${blob.color},0)`)
      }
      context.globalCompositeOperation = 'source-over'
      glow(c * 0.65, c * 0.5, c * 0.9, 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)')
      glow(c, c, c, 'rgba(120,0,10,0)', 'rgba(120,0,10,0.35)', c * 0.6)

      element.style.setProperty('--orb-level', level.toFixed(3))
      element.style.setProperty('--orb-scale', still ? '1' : (1 + level * 0.14).toFixed(3))
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [size, state, getLevels])

  return (
    <span aria-hidden="true" className="voice-orb" ref={wrapper} style={{ width: size, height: size }}>
      <span className="voice-orb-halo" style={{ filter: `blur(${Math.max(4, size * 0.16)}px)` }} />
      <canvas className="voice-orb-canvas" ref={canvas} />
    </span>
  )
}
