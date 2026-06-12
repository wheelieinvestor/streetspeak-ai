import { describe, expect, it } from "vitest";
import {
  buildConnectReadinessPanelModel,
  type ConnectReadinessPanelOptions
} from "./connect-readiness";

const BASE_OPTIONS: ConnectReadinessPanelOptions = {
  connectionState: {
    status: "disconnected",
    mode: "local_demo_read_only"
  },
  storageAvailable: true,
  voiceInputStatus: "idle",
  voiceInputMessage:
    "Browser-native speech input is available. Transcripts use the same mock parser as typed commands.",
  voiceOutputStatus: "ready",
  voiceOutputMessage:
    "Browser-native voice output is ready. Speak-back uses short safe mock summaries only.",
  robinhoodReadOnlyState: "unconfigured",
  safetyFlags: {
    mockModeLocked: true,
    liveTradingEnabled: false,
    liveTradingAvailable: false
  }
};

describe("connect readiness panel model", () => {
  it("labels the disconnected state as local-only and safe by default", () => {
    const model = buildConnectReadinessPanelModel(BASE_OPTIONS);

    expect(model).toMatchObject({
      status: "disconnected",
      headline: "Local demo connection is off",
      primaryActionLabel: "Connect local demo",
      disconnectAvailable: false,
      credentialsStoredByStreetSpeak: false,
      liveTradingAvailable: false
    });
    expect(model.summary).toContain("local mock readiness session only");
    expect(model.items).toContainEqual(
      expect.objectContaining({
        id: "local-demo",
        value: "disconnected",
        state: "attention"
      })
    );
    expect(model.items).toContainEqual(
      expect.objectContaining({
        id: "live-trading",
        value: "unavailable",
        state: "unavailable"
      })
    );
    expect(model.items).toContainEqual(
      expect.objectContaining({
        id: "credentials",
        value: "not stored",
        state: "ready"
      })
    );
  });

  it("shows connected local demo readiness without implying broker connection", () => {
    const model = buildConnectReadinessPanelModel({
      ...BASE_OPTIONS,
      connectionState: {
        status: "connected",
        mode: "local_demo_read_only",
        connectedAt: "2026-01-01T00:00:00.000Z"
      },
      robinhoodReadOnlyState: "available"
    });

    expect(model).toMatchObject({
      status: "connected",
      headline: "Connected to local demo",
      connectedAtLabel: "2026-01-01T00:00:00.000Z",
      primaryActionLabel: "Connected",
      disconnectAvailable: true
    });
    expect(model.summary).toContain("not a broker account connection");
    expect(model.items).toContainEqual(
      expect.objectContaining({
        id: "local-demo",
        value: "connected",
        detail:
          "Connected means the browser-local mock workflow is ready. It does not mean a broker is connected.",
        state: "ready"
      })
    );
    expect(model.items).toContainEqual(
      expect.objectContaining({
        id: "robinhood-read-only",
        value: "available",
        state: "ready"
      })
    );
  });

  it("keeps voice and storage readiness labels accurate", () => {
    const model = buildConnectReadinessPanelModel({
      ...BASE_OPTIONS,
      storageAvailable: false,
      voiceInputStatus: "unsupported",
      voiceInputMessage:
        "Browser-native speech input is not supported here. Typed commands still work.",
      voiceOutputStatus: "speaking",
      voiceOutputMessage: "Speaking a safe mock summary.",
      robinhoodReadOnlyState: "unavailable"
    });

    expect(model.items).toContainEqual(
      expect.objectContaining({
        id: "voice-input",
        value: "unsupported",
        state: "unavailable"
      })
    );
    expect(model.items).toContainEqual(
      expect.objectContaining({
        id: "voice-output",
        value: "speaking",
        state: "active"
      })
    );
    expect(model.items).toContainEqual(
      expect.objectContaining({
        id: "storage",
        value: "unavailable",
        state: "attention"
      })
    );
  });
});
