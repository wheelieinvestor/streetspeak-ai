import { describe, expect, it } from "vitest";
import { createMockTradingDeskTurn } from "@streetspeak-ai/core";
import {
  BrowserVoiceController,
  BrowserVoiceOutputController,
  buildSafeSpeakBackText,
  createInitialBrowserVoiceState,
  createInitialBrowserVoiceOutputState,
  extractSpeechTranscript,
  type BrowserVoiceOutputState,
  type BrowserVoiceState,
  type SpeechRecognitionLike
} from "./browser-speech";
import { getDemoSafetyFlags } from "./demo-state";

type SpeechRecognitionResultEvent = Parameters<
  NonNullable<SpeechRecognitionLike["onresult"]>
>[0];

class MockRecognition implements SpeechRecognitionLike {
  static instance: MockRecognition | null = null;

  continuous = false;
  interimResults = false;
  lang = "";
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: SpeechRecognitionLike["onerror"] = null;
  onresult: SpeechRecognitionLike["onresult"] = null;

  constructor() {
    MockRecognition.instance = this;
  }

  start(): void {
    this.onstart?.();
  }

  stop(): void {
    this.onend?.();
  }

  abort(): void {}

  emitResult(event: SpeechRecognitionResultEvent): void {
    this.onresult?.(event);
  }
}

class MockUtterance {
  rate = 1;
  pitch = 1;
  onend: (() => void) | null = null;
  onerror: ((event: { readonly error?: string }) => void) | null = null;

  constructor(readonly text: string) {}
}

class MockSpeechSynthesis {
  speaking = false;
  spokenTexts: string[] = [];
  cancelled = false;

  speak(utterance: MockUtterance): void {
    this.speaking = true;
    this.spokenTexts.push(utterance.text);
    utterance.onend?.();
    this.speaking = false;
  }

  cancel(): void {
    this.cancelled = true;
    this.speaking = false;
  }
}

describe("browser speech adapter", () => {
  it("creates an unsupported state when browser speech is unavailable", () => {
    expect(createInitialBrowserVoiceState({}, true)).toEqual({
      status: "unsupported",
      message:
        "Browser-native speech input is not supported here. Typed commands still work.",
      lastTranscript: ""
    });
  });

  it("extracts browser-native transcripts without raw audio", () => {
    const transcript = extractSpeechTranscript({
      resultIndex: 0,
      results: {
        length: 1,
        0: {
          length: 1,
          isFinal: true,
          0: {
            transcript: " buy 5 HOOD ",
            confidence: 0.93
          }
        }
      }
    });

    expect(transcript).toMatchObject({
      text: "buy 5 HOOD",
      confidence: 0.93,
      provider: "browser",
      status: "transcribed"
    });
  });

  it("passes actionable browser transcripts into the shared command path", () => {
    const states: BrowserVoiceState[] = [];
    const commands: string[] = [];
    const controller = new BrowserVoiceController(
      {
        SpeechRecognition: MockRecognition
      },
      {
        onStateChange(state) {
          states.push(state);
        },
        onCommand(text, source) {
          commands.push(`${source}:${text}`);
        }
      },
      true
    );

    controller.start();
    MockRecognition.instance?.emitResult({
      resultIndex: 0,
      results: {
        length: 1,
        0: {
          length: 1,
          isFinal: true,
          0: {
            transcript: "buy 5 HOOD",
            confidence: 0.96
          }
        }
      }
    });

    expect(states.map((state) => state.status)).toContain("listening");
    expect(states.find((state) => state.status === "listening")).toMatchObject({
      message:
        "Listening through browser-native speech input. StreetSpeak AI does not store raw audio or send it to a StreetSpeak server."
    });
    expect(states.map((state) => state.message).join(" ")).not.toContain(
      "Listening locally through the browser"
    );
    expect(states.at(-1)).toMatchObject({
      status: "stopped",
      lastTranscript: "buy 5 HOOD"
    });
    expect(commands).toEqual(["voice:buy 5 HOOD"]);
  });

  it("creates an unsupported output state when speech synthesis is unavailable", () => {
    expect(createInitialBrowserVoiceOutputState({}, true)).toEqual({
      status: "unsupported",
      message:
        "Browser-native voice output is not supported here. Text responses still work.",
      lastSpokenText: ""
    });
  });

  it("does not speak when browser voice output is disabled", () => {
    const synthesis = new MockSpeechSynthesis();
    const states: BrowserVoiceOutputState[] = [];
    const controller = new BrowserVoiceOutputController(
      {
        speechSynthesis: synthesis,
        SpeechSynthesisUtterance: MockUtterance
      },
      {
        onStateChange(state) {
          states.push(state);
        }
      },
      false
    );

    controller.speak("Mock ticket ready.");

    expect(synthesis.spokenTexts).toEqual([]);
    expect(states.at(-1)).toMatchObject({
      status: "disabled",
      message: "Enable browser voice output in local settings first."
    });
  });

  it("speaks short safe mock summaries without leaking quote values or receipt details", async () => {
    const quoteState = await createMockTradingDeskTurn(
      "what is HOOD trading at",
      {
        now: new Date("2026-01-01T00:00:00.000Z")
      }
    );
    const ticketState = await createMockTradingDeskTurn("buy 5 HOOD", {
      now: new Date("2026-01-01T00:00:00.000Z")
    });
    const quoteSummary = buildSafeSpeakBackText(quoteState);
    const ticketSummary = buildSafeSpeakBackText(ticketState);

    expect(quoteSummary).toBe(
      "Mock quote answer for HOOD is ready. Review the static fixture quote on screen. No live market data was used."
    );
    expect(quoteSummary).not.toContain("$");
    expect(quoteSummary).not.toContain("bid");
    expect(ticketSummary).toBe(
      "Mock buy ticket for 5 HOOD is ready. Review safety, then type the exact confirmation phrase and code. No live order can be placed."
    );
    expect(ticketSummary).not.toContain(ticketState.challenge?.requiredPhrase);
    expect(ticketSummary).not.toContain(ticketState.challenge?.code);
  });

  it("speaks safe summaries without changing mock-only safety flags", async () => {
    const synthesis = new MockSpeechSynthesis();
    const states: BrowserVoiceOutputState[] = [];
    const controller = new BrowserVoiceOutputController(
      {
        speechSynthesis: synthesis,
        SpeechSynthesisUtterance: MockUtterance
      },
      {
        onStateChange(state) {
          states.push(state);
        }
      },
      true
    );
    const deskState = await createMockTradingDeskTurn("buy 5 HOOD", {
      now: new Date("2026-01-01T00:00:00.000Z")
    });

    controller.speakForState(deskState);

    expect(synthesis.spokenTexts).toEqual([
      "Mock buy ticket for 5 HOOD is ready. Review safety, then type the exact confirmation phrase and code. No live order can be placed."
    ]);
    expect(states.map((state) => state.status)).toContain("speaking");
    expect(getDemoSafetyFlags()).toEqual({
      mockModeLocked: true,
      liveTradingEnabled: false,
      liveTradingAvailable: false
    });
  });
});
