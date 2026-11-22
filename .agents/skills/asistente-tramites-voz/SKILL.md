---
name: asistente-tramites-voz
description: Configure and verify speech input and output for the OrientaT website chat and browser extension.
---

# OrientaT voice guidance

- Voice is an interface to the existing chat. Transcription goes through `sendMessage` on the website and `send`/`runTurn` in the extension. Do not create a separate conversational agent or duplicate the chat's logic and tools.
- `src/voice/use-speech.ts` shares capture, transcription, turn queueing, and playback across both interfaces. Scribe v3 Live transcribes 24 kHz PCM16 with automatic language detection and voice activity detection. Eleven v4 reads final chat replies aloud. Tool questions can be spoken while the agent waits for a response.
- `web/server/voice.ts` issues a short lived Scribe token and converts chat text to audio. Configure `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, and optionally `ELEVENLABS_TTS_MODEL` on the server. Keep keys out of the browser bundle and Git.
- Ending a voice session stops capture and playback and discards queued input while retaining chat history. Starting a new chat stops voice before clearing history. Do not read messages from before the microphone was opened.
- Verify with sample audio that transcription submits to the normal chat exactly once, synthesized speech comes from that reply, and context survives switching between voice and keyboard. Check language handling, playback interruption, and microphone release.
- References: [Scribe Realtime](https://elevenlabs.io/docs/api-reference/speech-to-text/v-1-speech-to-text-realtime) and [text to speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).
