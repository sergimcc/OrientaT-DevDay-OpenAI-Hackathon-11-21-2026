import { useSpeech, type SpeechOptions, type VoiceError } from '../voice/use-speech'
export type { VoiceStatus, VoiceError, VoiceLevels } from '../voice/use-speech'
export const LOCAL_VOICE_API = 'http://127.0.0.1:5173/api/voice/session'

export const VOICE_MESSAGES: Record<VoiceError, string> = {
  unavailable: 'Este navegador no permite iniciar una conversación de voz.',
  permission: 'Permite el micrófono en la pestaña que se ha abierto y vuelve a pulsar el botón de voz.',
  timeout: 'La conexión de voz tardó demasiado. Vuelve a intentarlo.',
  connection: 'No se pudo iniciar la voz. Comprueba el micrófono y ELEVENLABS_API_KEY en web/.env.local.',
  response: 'No se pudo completar la respuesta de voz.',
  disconnected: 'Se cerró la conexión de voz.',
}

async function microphoneAllowed(): Promise<boolean> {
  try {
    return (await navigator.permissions.query({ name: 'microphone' as PermissionName })).state === 'granted'
  } catch {
    return true
  }
}

function askForMicrophoneInATab() {
  try {
    void chrome.tabs.create({ url: chrome.runtime.getURL('microphone.html') })
  } catch {
    // Outside the extension there is no permission tab to open.
  }
}

export function useVoiceSession(options: SpeechOptions) {
  return useSpeech(options, 'http://127.0.0.1:5173/api/voice', chrome.runtime?.getURL?.('voice-capture.js') ?? 'voice-capture.js', askForMicrophoneInATab, microphoneAllowed)
}
