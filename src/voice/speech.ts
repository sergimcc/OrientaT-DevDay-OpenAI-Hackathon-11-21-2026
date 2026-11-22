export type SpokenReply = { id: string; text: string; ready?: boolean }

/** Read the chat's words without pronouncing Markdown formatting or raw URLs. */
export function speechText(text: string): string {
  return text.replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/^[\s]*#{1,6}\s+/gm, '')
    .replace(/[*_`]/g, '').trim()
}

export function scribeUrl(token: string): string {
  const params = new URLSearchParams({
    token, model_id: 'scribe_v3_live', audio_format: 'pcm_24000',
    commit_strategy: 'vad', vad_silence_threshold_secs: '0.8',
  })
  return `wss://api.elevenlabs.io/v1/speech-to-text/realtime?${params}`
}
