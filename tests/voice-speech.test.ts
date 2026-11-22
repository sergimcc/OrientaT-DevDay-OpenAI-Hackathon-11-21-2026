import { describe, expect, it } from 'vitest'
import { scribeUrl, speechText } from '../src/voice/speech'

describe('chat speech adapter', () => {
  it('reads chat text without Markdown syntax or URLs', () => {
    expect(speechText('## Documentación\nTrae **tu DNI**. Consulta [la sede](https://sede.example).')).toBe('Documentación\nTrae tu DNI. Consulta la sede.')
  })
  it('uses automatic language detection and transcription only', () => {
    const url = new URL(scribeUrl('temporary-token'))
    expect(url.pathname).toBe('/v1/speech-to-text/realtime')
    expect(url.searchParams.get('model_id')).toBe('scribe_v3_live')
    expect(url.searchParams.get('commit_strategy')).toBe('vad')
    expect(url.searchParams.has('language_code')).toBe(false)
  })
})
