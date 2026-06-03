export interface VoiceTranscript {
  readonly text: string;
  readonly confidence?: number;
  readonly provider: "browser" | "local" | "elevenlabs" | "mock";
}

export interface VoiceProvider {
  readonly name: string;
  transcribe(input: AsyncIterable<Uint8Array>): Promise<VoiceTranscript>;
}

export function createMockTranscript(text: string): VoiceTranscript {
  return {
    text,
    confidence: 1,
    provider: "mock"
  };
}
