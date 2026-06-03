export type VoiceProviderKind = "browser" | "local" | "elevenlabs" | "mock";
export type VoiceIntentStatus =
  | "transcribed"
  | "unintelligible"
  | "provider_error";

export interface VoiceTranscript {
  readonly id: string;
  readonly text: string;
  readonly confidence?: number;
  readonly provider: VoiceProviderKind;
  readonly capturedAt: string;
  readonly status: VoiceIntentStatus;
}

export interface VoiceProvider {
  readonly name: string;
  readonly kind: VoiceProviderKind;
  readonly mode: "mock";
  transcribe(input: AsyncIterable<Uint8Array>): Promise<VoiceTranscript>;
}

export function createMockTranscript(
  text: string,
  options: {
    readonly id?: string;
    readonly confidence?: number;
    readonly now?: Date;
  } = {}
): VoiceTranscript {
  const trimmedText = text.trim();

  return {
    id: options.id ?? "mock-transcript",
    text: trimmedText,
    confidence: options.confidence ?? (trimmedText ? 1 : 0),
    provider: "mock",
    capturedAt: (options.now ?? new Date()).toISOString(),
    status: trimmedText ? "transcribed" : "unintelligible"
  };
}

export function createMockVoiceProvider(): VoiceProvider {
  return {
    name: "mock-voice-provider",
    kind: "mock",
    mode: "mock",
    async transcribe(): Promise<VoiceTranscript> {
      return createMockTranscript("");
    }
  };
}

export function isActionableTranscript(transcript: VoiceTranscript): boolean {
  return (
    transcript.provider === "mock" &&
    transcript.status === "transcribed" &&
    transcript.text.length > 0 &&
    (transcript.confidence ?? 0) >= 0.7
  );
}
