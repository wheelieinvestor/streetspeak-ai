import { describe, expect, it } from "vitest";
import {
  BrowserVoiceController,
  createInitialBrowserVoiceState,
  extractSpeechTranscript,
  type BrowserVoiceState,
  type SpeechRecognitionLike
} from "./browser-speech";

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
    expect(states.at(-1)).toMatchObject({
      status: "stopped",
      lastTranscript: "buy 5 HOOD"
    });
    expect(commands).toEqual(["voice:buy 5 HOOD"]);
  });
});
