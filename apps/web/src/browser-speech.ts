import {
  createBrowserSpeechTranscript,
  detectBrowserSpeechSupport,
  isActionableTranscript,
  type BrowserSpeechHost,
  type VoiceTranscript
} from "@streetspeak-ai/voice";
import type { CommandSource, MockTradingDeskState } from "@streetspeak-ai/core";

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

export type BrowserVoiceOutputStatus =
  | "unsupported"
  | "disabled"
  | "ready"
  | "speaking"
  | "error";

export interface BrowserVoiceOutputState {
  readonly status: BrowserVoiceOutputStatus;
  readonly message: string;
  readonly lastSpokenText: string;
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

interface SpeechSynthesisErrorEventLike {
  readonly error?: string;
}

interface SpeechSynthesisUtteranceLike {
  text: string;
  rate: number;
  pitch: number;
  onend: (() => void) | null;
  onerror: ((event: SpeechSynthesisErrorEventLike) => void) | null;
}

type SpeechSynthesisUtteranceConstructor = new (
  text: string
) => SpeechSynthesisUtteranceLike;

interface SpeechSynthesisLike {
  readonly speaking?: boolean;
  cancel(): void;
  speak(utterance: SpeechSynthesisUtteranceLike): void;
}

export interface BrowserSpeechOutputHost extends BrowserSpeechHost {
  readonly speechSynthesis?: SpeechSynthesisLike;
  readonly SpeechSynthesisUtterance?: SpeechSynthesisUtteranceConstructor;
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

export function createInitialBrowserVoiceOutputState(
  host: BrowserSpeechOutputHost | null,
  enabled: boolean
): BrowserVoiceOutputState {
  if (!enabled) {
    return {
      status: "disabled",
      message: "Browser voice output is disabled in local settings.",
      lastSpokenText: ""
    };
  }

  if (!getBrowserSpeechOutputAdapter(host)) {
    return {
      status: "unsupported",
      message:
        "Browser-native voice output is not supported here. Text responses still work.",
      lastSpokenText: ""
    };
  }

  return {
    status: "ready",
    message:
      "Browser-native voice output is ready. Speak-back uses short safe mock summaries only.",
    lastSpokenText: ""
  };
}

function getBrowserSpeechOutputAdapter(host: BrowserSpeechOutputHost | null): {
  readonly synthesis: SpeechSynthesisLike;
  readonly Utterance: SpeechSynthesisUtteranceConstructor;
} | null {
  const outputHost = host;
  const synthesis = outputHost?.speechSynthesis;
  const Utterance = outputHost?.SpeechSynthesisUtterance;

  if (!synthesis || typeof Utterance !== "function") {
    return null;
  }

  return {
    synthesis,
    Utterance
  };
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

export function buildSafeSpeakBackText(
  state: MockTradingDeskState | null
): string {
  if (!state) {
    return "StreetSpeak AI is ready. Mock mode is active and live trading is unavailable.";
  }

  if (state.status === "mock_submitted" && state.ticket) {
    return `Mock submission recorded for ${state.ticket.side} ${state.ticket.quantity} ${state.ticket.symbol}. No live broker order was placed.`;
  }

  if (state.status === "confirmation_rejected") {
    return "Confirmation rejected. Generic confirmations never submit. Use the exact mock confirmation phrase and code.";
  }

  if (state.ticket && state.challenge) {
    return `Mock ${state.ticket.side} ticket for ${state.ticket.quantity} ${state.ticket.symbol} is ready. Review safety, then type the exact confirmation phrase and code. No live order can be placed.`;
  }

  if (state.parse.kind === "portfolio_question") {
    return "Mock portfolio answer is ready. Review the local fixture data on screen. No live broker data was used.";
  }

  if (state.parse.kind === "quote_question") {
    return `Mock quote answer for ${state.parse.symbol} is ready. Review the static fixture quote on screen. No live market data was used.`;
  }

  if (state.status === "unsupported" || state.status === "invalid") {
    return "StreetSpeak AI could not create a mock ticket from that command. Typed commands still work, and live trading remains unavailable.";
  }

  return "StreetSpeak AI updated the mock trading desk. Review the on-screen details before taking any next step.";
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
          "Listening through browser-native speech input. StreetSpeak AI does not store raw audio or send it to a StreetSpeak server.",
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
            ? "Browser-native speech transcript captured. StreetSpeak AI stores only the resulting text when an audit event is created."
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

export class BrowserVoiceOutputController {
  #state: BrowserVoiceOutputState;

  constructor(
    private readonly host: BrowserSpeechOutputHost | null,
    private readonly callbacks: {
      onStateChange(state: BrowserVoiceOutputState): void;
    },
    enabled: boolean
  ) {
    this.#state = createInitialBrowserVoiceOutputState(host, enabled);
  }

  get state(): BrowserVoiceOutputState {
    return this.#state;
  }

  speak(text: string): void {
    if (this.#state.status === "disabled") {
      this.#emit({
        ...this.#state,
        message: "Enable browser voice output in local settings first."
      });
      return;
    }

    const adapter = getBrowserSpeechOutputAdapter(this.host);

    if (!adapter) {
      this.#emit(createInitialBrowserVoiceOutputState(this.host, true));
      return;
    }

    const safeText = text.trim();

    if (!safeText) {
      return;
    }

    if (adapter.synthesis.speaking) {
      adapter.synthesis.cancel();
    }

    const utterance = new adapter.Utterance(safeText);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => {
      this.#emit({
        status: "ready",
        message: "Browser voice output is ready.",
        lastSpokenText: safeText
      });
    };
    utterance.onerror = (event) => {
      this.#emit({
        status: "error",
        message: `Browser voice output error: ${event.error ?? "unknown error"}. Text responses still work.`,
        lastSpokenText: safeText
      });
    };

    this.#emit({
      status: "speaking",
      message: "Speaking a safe mock-only summary.",
      lastSpokenText: safeText
    });
    adapter.synthesis.speak(utterance);
  }

  speakForState(state: MockTradingDeskState | null): void {
    this.speak(buildSafeSpeakBackText(state));
  }

  stop(): void {
    const adapter = getBrowserSpeechOutputAdapter(this.host);
    adapter?.synthesis.cancel();
    this.#emit(createInitialBrowserVoiceOutputState(this.host, true));
  }

  setEnabled(enabled: boolean): void {
    const adapter = getBrowserSpeechOutputAdapter(this.host);
    adapter?.synthesis.cancel();
    this.#emit(createInitialBrowserVoiceOutputState(this.host, enabled));
  }

  #emit(state: BrowserVoiceOutputState): void {
    this.#state = state;
    this.callbacks.onStateChange(state);
  }
}
