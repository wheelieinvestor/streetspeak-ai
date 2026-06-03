import { describe, expect, it } from "vitest";
import {
  createMockTranscript,
  createMockVoiceProvider,
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
});

async function* asyncIterable(
  chunks: readonly Uint8Array[]
): AsyncIterable<Uint8Array> {
  for (const chunk of chunks) {
    yield chunk;
  }
}
