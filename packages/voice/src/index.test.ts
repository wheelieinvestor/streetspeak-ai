import { describe, expect, it } from "vitest";
import { createMockTranscript } from "./index.js";

describe("voice abstraction", () => {
  it("creates mock transcripts for local development", () => {
    expect(createMockTranscript("show my portfolio")).toEqual({
      text: "show my portfolio",
      confidence: 1,
      provider: "mock"
    });
  });
});
