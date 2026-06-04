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

export interface BrowserSpeechHost {
  readonly SpeechRecognition?: unknown;
  readonly webkitSpeechRecognition?: unknown;
}

export type BrowserSpeechSupport =
  | {
      readonly supported: true;
      readonly provider: "browser_native";
      readonly transcriptProvider: "browser";
      readonly usesExternalApiKey: false;
      readonly rawAudioStoredByStreetSpeak: false;
    }
  | {
      readonly supported: false;
      readonly reason: "not_in_browser" | "recognition_api_unavailable";
      readonly usesExternalApiKey: false;
      readonly rawAudioStoredByStreetSpeak: false;
    };

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

export function createBrowserSpeechTranscript(
  text: string,
  options: {
    readonly id?: string;
    readonly confidence?: number;
    readonly now?: Date;
  } = {}
): VoiceTranscript {
  const trimmedText = text.trim();

  return {
    id: options.id ?? "browser-speech-transcript",
    text: trimmedText,
    confidence: options.confidence ?? (trimmedText ? 0.8 : 0),
    provider: "browser",
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

export function detectBrowserSpeechSupport(
  host: BrowserSpeechHost | null | undefined = globalThis as BrowserSpeechHost
): BrowserSpeechSupport {
  if (!host) {
    return {
      supported: false,
      reason: "not_in_browser",
      usesExternalApiKey: false,
      rawAudioStoredByStreetSpeak: false
    };
  }

  const recognitionConstructor =
    host.SpeechRecognition ?? host.webkitSpeechRecognition;

  if (typeof recognitionConstructor !== "function") {
    return {
      supported: false,
      reason: "recognition_api_unavailable",
      usesExternalApiKey: false,
      rawAudioStoredByStreetSpeak: false
    };
  }

  return {
    supported: true,
    provider: "browser_native",
    transcriptProvider: "browser",
    usesExternalApiKey: false,
    rawAudioStoredByStreetSpeak: false
  };
}

export function isActionableTranscript(transcript: VoiceTranscript): boolean {
  return (
    (transcript.provider === "mock" || transcript.provider === "browser") &&
    transcript.status === "transcribed" &&
    transcript.text.length > 0 &&
    (transcript.confidence ?? 0) >= 0.7
  );
}
