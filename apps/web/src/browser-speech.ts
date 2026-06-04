import {
  createBrowserSpeechTranscript,
  detectBrowserSpeechSupport,
  isActionableTranscript,
  type BrowserSpeechHost,
  type VoiceTranscript
} from "@streetspeak-ai/voice";
import type { CommandSource } from "@streetspeak-ai/core";

export type BrowserVoiceStatus =
  | "unsupported"
  | "disabled"
  | "idle"
  | "listening"
  | "stopped"
  | "error";

export interface BrowserVoiceState {
  readonly status: BrowserVoiceStatus;
  readonly message: string;
  readonly lastTranscript: string;
}

export interface BrowserVoiceCallbacks {
  onStateChange(state: BrowserVoiceState): void;
  onCommand(text: string, source: Extract<CommandSource, "voice">): void;
}

interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
  readonly confidence?: number;
}

interface SpeechRecognitionResultLike {
  readonly isFinal?: boolean;
  readonly length: number;
  readonly [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionResultEventLike {
  readonly resultIndex?: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike {
  readonly error?: string;
  readonly message?: string;
}

export interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechRecognitionWindow extends BrowserSpeechHost {
  readonly SpeechRecognition?: SpeechRecognitionConstructor;
  readonly webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export function createInitialBrowserVoiceState(
  host: BrowserSpeechHost | null,
  enabled: boolean
): BrowserVoiceState {
  if (!enabled) {
    return {
      status: "disabled",
      message: "Browser voice input is disabled in local settings.",
      lastTranscript: ""
    };
  }

  const support = detectBrowserSpeechSupport(host);

  if (!support.supported) {
    return {
      status: "unsupported",
      message:
        "Browser-native speech input is not supported here. Typed commands still work.",
      lastTranscript: ""
    };
  }

  return {
    status: "idle",
    message:
      "Browser-native speech input is available. Transcripts use the same mock parser as typed commands.",
    lastTranscript: ""
  };
}

export function getSpeechRecognitionConstructor(
  host: BrowserSpeechHost | null
): SpeechRecognitionConstructor | null {
  const speechHost = host as SpeechRecognitionWindow | null;

  return (
    speechHost?.SpeechRecognition ?? speechHost?.webkitSpeechRecognition ?? null
  );
}

export function extractSpeechTranscript(
  event: SpeechRecognitionResultEventLike
): VoiceTranscript {
  const resultIndex = event.resultIndex ?? 0;
  const transcripts: string[] = [];
  let confidence = 0;

  for (let index = resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    const alternative = result?.[0];

    if (alternative?.transcript) {
      transcripts.push(alternative.transcript);
      confidence = Math.max(confidence, alternative.confidence ?? 0.8);
    }
  }

  return createBrowserSpeechTranscript(transcripts.join(" "), {
    confidence: confidence || undefined
  });
}

export class BrowserVoiceController {
  #recognition: SpeechRecognitionLike | null = null;
  #state: BrowserVoiceState;

  constructor(
    private readonly host: BrowserSpeechHost | null,
    private readonly callbacks: BrowserVoiceCallbacks,
    enabled: boolean
  ) {
    this.#state = createInitialBrowserVoiceState(host, enabled);
  }

  get state(): BrowserVoiceState {
    return this.#state;
  }

  start(): void {
    if (this.#state.status === "disabled") {
      this.#emit({
        ...this.#state,
        message: "Enable browser voice input in local settings first."
      });
      return;
    }

    const Recognition = getSpeechRecognitionConstructor(this.host);

    if (!Recognition) {
      this.#emit(createInitialBrowserVoiceState(this.host, true));
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onstart = () => {
      this.#emit({
        status: "listening",
        message:
          "Listening locally through the browser. No raw audio is stored by StreetSpeak AI.",
        lastTranscript: this.#state.lastTranscript
      });
    };
    recognition.onend = () => {
      if (this.#state.status === "listening") {
        this.#emit({
          status: "stopped",
          message: "Listening stopped.",
          lastTranscript: this.#state.lastTranscript
        });
      }
    };
    recognition.onerror = (event) => {
      this.#emit({
        status: "error",
        message: `Browser speech input error: ${event.error ?? event.message ?? "unknown error"}. Typed commands still work.`,
        lastTranscript: this.#state.lastTranscript
      });
    };
    recognition.onresult = (event) => {
      const transcript = extractSpeechTranscript(event);

      this.#emit({
        status: transcript.status === "transcribed" ? "stopped" : "error",
        message:
          transcript.status === "transcribed"
            ? "Voice transcript captured locally by the browser."
            : "No usable voice transcript was captured. Typed commands still work.",
        lastTranscript: transcript.text
      });

      if (isActionableTranscript(transcript)) {
        this.callbacks.onCommand(transcript.text, "voice");
      }
    };

    this.#recognition = recognition;
    recognition.start();
  }

  stop(): void {
    this.#recognition?.stop();
    this.#recognition = null;
    this.#emit({
      status: "stopped",
      message: "Listening stopped.",
      lastTranscript: this.#state.lastTranscript
    });
  }

  setEnabled(enabled: boolean): void {
    this.stop();
    this.#emit(createInitialBrowserVoiceState(this.host, enabled));
  }

  #emit(state: BrowserVoiceState): void {
    this.#state = state;
    this.callbacks.onStateChange(state);
  }
}
