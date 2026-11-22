import { useSpeech, type SpeechOptions } from "../../../../src/voice/use-speech";
import captureModule from "./voice-capture.js?url&no-inline";

export function useVoiceSession(options: SpeechOptions) {
  return useSpeech(options, "/api/voice", captureModule);
}
