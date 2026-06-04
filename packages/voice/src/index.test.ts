import { describe, expect, it } from "vitest";
import {
  createBrowserSpeechTranscript,
  createMockTranscript,
  createMockVoiceProvider,
  detectBrowserSpeechSupport,
  isActionableTranscript
} from "./index.js";

describe("voice abstraction", () => {
  it("creates mock transcripts for local development", () => {
    expect(
      createMockTranscript(" show my portfolio ", {
        id: "transcript-1",
        now: new Date("2026-01-01T00:00:00.000Z")
      })
    ).toEqual({
      id: "transcript-1",
      text: "show my portfolio",
      confidence: 1,
      provider: "mock",
      capturedAt: "2026-01-01T00:00:00.000Z",
      status: "transcribed"
    });
  });

  it("marks blank transcripts as not actionable", () => {
    const transcript = createMockTranscript("   ", {
      now: new Date("2026-01-01T00:00:00.000Z")
    });

    expect(transcript.status).toBe("unintelligible");
    expect(isActionableTranscript(transcript)).toBe(false);
  });

  it("exposes a mock provider contract", async () => {
    const provider = createMockVoiceProvider();
    const transcript = await provider.transcribe(asyncIterable([]));

    expect(provider.mode).toBe("mock");
    expect(transcript.provider).toBe("mock");
  });

  it("detects browser-native speech support without external API keys", () => {
    expect(
      detectBrowserSpeechSupport({
        SpeechRecognition: class MockSpeechRecognition {}
      })
    ).toEqual({
      supported: true,
      provider: "browser_native",
      transcriptProvider: "browser",
      usesExternalApiKey: false,
      rawAudioStoredByStreetSpeak: false
    });
  });

  it("reports unsupported browser speech when recognition is unavailable", () => {
    expect(detectBrowserSpeechSupport({})).toEqual({
      supported: false,
      reason: "recognition_api_unavailable",
      usesExternalApiKey: false,
      rawAudioStoredByStreetSpeak: false
    });
  });

  it("marks browser-native transcripts as actionable when confidence is sufficient", () => {
    const transcript = createBrowserSpeechTranscript(" buy 5 HOOD ", {
      id: "browser-transcript-1",
      confidence: 0.91,
      now: new Date("2026-01-01T00:00:00.000Z")
    });

    expect(transcript).toEqual({
      id: "browser-transcript-1",
      text: "buy 5 HOOD",
      confidence: 0.91,
      provider: "browser",
      capturedAt: "2026-01-01T00:00:00.000Z",
      status: "transcribed"
    });
    expect(isActionableTranscript(transcript)).toBe(true);
  });
});

async function* asyncIterable(
  chunks: readonly Uint8Array[]
): AsyncIterable<Uint8Array> {
  for (const chunk of chunks) {
    yield chunk;
  }
}
