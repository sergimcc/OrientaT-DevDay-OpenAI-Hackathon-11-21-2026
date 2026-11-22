class VoiceCapture extends AudioWorkletProcessor {
  // Send one PCM16 frame every 20 ms at the session's 24 kHz sample rate.
  frame = new ArrayBuffer(480 * 2);
  samples = new DataView(this.frame);
  offset = 0;

  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;

    for (const value of channel) {
      const sample = Math.max(-1, Math.min(1, value));
      this.samples.setInt16(this.offset, sample * (sample < 0 ? 32768 : 32767), true);
      this.offset += 2;
      if (this.offset === this.frame.byteLength) {
        this.port.postMessage(this.frame, [this.frame]);
        this.frame = new ArrayBuffer(480 * 2);
        this.samples = new DataView(this.frame);
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor("voice-capture", VoiceCapture);
