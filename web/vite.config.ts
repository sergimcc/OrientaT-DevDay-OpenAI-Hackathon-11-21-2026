import path from 'node:path'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { chatApi } from './server/chat.ts'
import { voiceSession } from './server/voice.ts'

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, import.meta.dirname, ''), ...process.env }
  const localVoiceConfig = path.resolve(import.meta.dirname, 'server/.env.elevenlabs.local.cjs')
  const localVoiceKey = existsSync(localVoiceConfig)
    ? createRequire(import.meta.url)(localVoiceConfig) as string
    : undefined
  return {
    // 127.0.0.1 only: /api/extension spends the OpenAI key in web/.env.local, so it must not be reachable
    // from the network. The extension calls it at this exact address (src/agent/localClient.ts).
    server: {
      host: '127.0.0.1', port: 5173, strictPort: true,
      cors: { origin: [/^chrome-extension:\/\/[a-p]{32}$/, /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/] },
      // The web reads the extension's site maps from ../plugins (one source of truth).
      fs: { allow: ['..'] },
    },
    plugins: [
      react(),
      tailwindcss(),
      chatApi(env, path.resolve(import.meta.dirname, '../plugins')),
      voiceSession(localVoiceKey ?? env.ELEVENLABS_API_KEY, env.ELEVENLABS_VOICE_ID || '7ilYbYb99yBZGMUUKSaf', env.ELEVENLABS_TTS_MODEL || 'eleven_v4'),
    ],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  }
})
