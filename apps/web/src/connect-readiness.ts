import type { DemoConnectionState, DemoSafetyFlags } from "./demo-state";
import type {
  BrowserVoiceOutputStatus,
  BrowserVoiceStatus
} from "./browser-speech";

export type ReadinessItemState =
  | "ready"
  | "active"
  | "attention"
  | "disabled"
  | "unavailable";

export type ReadinessBrokerState =
  | "disabled"
  | "fixture_only"
  | "unconfigured"
  | "available"
  | "unavailable";

export interface ReadinessItem {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly state: ReadinessItemState;
}

export interface ConnectReadinessPanelModel {
  readonly status: DemoConnectionState["status"];
  readonly headline: string;
  readonly summary: string;
  readonly connectedAtLabel: string | null;
  readonly primaryActionLabel: "Connect local demo" | "Connected";
  readonly disconnectActionLabel: "Disconnect local demo";
  readonly disconnectAvailable: boolean;
  readonly credentialsStoredByStreetSpeak: false;
  readonly liveTradingAvailable: false;
  readonly items: readonly ReadinessItem[];
}

export interface ConnectReadinessPanelOptions {
  readonly connectionState: DemoConnectionState;
  readonly storageAvailable: boolean;
  readonly voiceInputStatus: BrowserVoiceStatus;
  readonly voiceInputMessage: string;
  readonly voiceOutputStatus: BrowserVoiceOutputStatus;
  readonly voiceOutputMessage: string;
  readonly robinhoodReadOnlyState: ReadinessBrokerState;
  readonly safetyFlags: DemoSafetyFlags;
}

export function buildConnectReadinessPanelModel(
  options: ConnectReadinessPanelOptions
): ConnectReadinessPanelModel {
  const connected = options.connectionState.status === "connected";

  return {
    status: options.connectionState.status,
    headline: connected
      ? "Connected to local demo"
      : "Local demo connection is off",
    summary: connected
      ? "The dashboard is ready for local mock commands. This is not a broker account connection."
      : "Connect starts a local mock readiness session only. It does not request broker credentials or enable live trading.",
    connectedAtLabel: options.connectionState.connectedAt ?? null,
    primaryActionLabel: connected ? "Connected" : "Connect local demo",
    disconnectActionLabel: "Disconnect local demo",
    disconnectAvailable: connected,
    credentialsStoredByStreetSpeak: false,
    liveTradingAvailable: false,
    items: [
      buildLocalDemoItem(options.connectionState),
      buildVoiceInputItem(options.voiceInputStatus, options.voiceInputMessage),
      buildVoiceOutputItem(
        options.voiceOutputStatus,
        options.voiceOutputMessage
      ),
      buildMockDeskItem(options.safetyFlags),
      buildRobinhoodReadOnlyItem(options.robinhoodReadOnlyState),
      buildLiveTradingItem(options.safetyFlags),
      buildStorageItem(options.storageAvailable),
      {
        id: "credentials",
        label: "Credentials",
        value: "not stored",
        detail:
          "StreetSpeak does not collect API keys, broker passwords, or plaintext credentials in this dashboard.",
        state: "ready"
      }
    ]
  };
}

function buildLocalDemoItem(
  connectionState: DemoConnectionState
): ReadinessItem {
  if (connectionState.status === "connected") {
    return {
      id: "local-demo",
      label: "Local demo",
      value: "connected",
      detail:
        "Connected means the browser-local mock workflow is ready. It does not mean a broker is connected.",
      state: "ready"
    };
  }

  return {
    id: "local-demo",
    label: "Local demo",
    value: "disconnected",
    detail:
      "Use Connect to mark the local mock workflow ready before sharing or demoing it.",
    state: "attention"
  };
}

function buildVoiceInputItem(
  status: BrowserVoiceStatus,
  message: string
): ReadinessItem {
  if (status === "listening") {
    return {
      id: "voice-input",
      label: "Voice input",
      value: "listening",
      detail: message,
      state: "active"
    };
  }

  if (status === "idle" || status === "stopped") {
    return {
      id: "voice-input",
      label: "Voice input",
      value: "ready",
      detail: message,
      state: "ready"
    };
  }

  if (status === "disabled") {
    return {
      id: "voice-input",
      label: "Voice input",
      value: "disabled",
      detail: message,
      state: "disabled"
    };
  }

  if (status === "unsupported") {
    return {
      id: "voice-input",
      label: "Voice input",
      value: "unsupported",
      detail: message,
      state: "unavailable"
    };
  }

  return {
    id: "voice-input",
    label: "Voice input",
    value: "needs attention",
    detail: message,
    state: "attention"
  };
}

function buildVoiceOutputItem(
  status: BrowserVoiceOutputStatus,
  message: string
): ReadinessItem {
  if (status === "speaking") {
    return {
      id: "voice-output",
      label: "Voice output",
      value: "speaking",
      detail: message,
      state: "active"
    };
  }

  if (status === "ready") {
    return {
      id: "voice-output",
      label: "Voice output",
      value: "ready",
      detail: message,
      state: "ready"
    };
  }

  if (status === "disabled") {
    return {
      id: "voice-output",
      label: "Voice output",
      value: "disabled",
      detail: message,
      state: "disabled"
    };
  }

  if (status === "unsupported") {
    return {
      id: "voice-output",
      label: "Voice output",
      value: "unsupported",
      detail: message,
      state: "unavailable"
    };
  }

  return {
    id: "voice-output",
    label: "Voice output",
    value: "needs attention",
    detail: message,
    state: "attention"
  };
}

function buildMockDeskItem(safetyFlags: DemoSafetyFlags): ReadinessItem {
  return {
    id: "mock-desk",
    label: "Mock trading desk",
    value: safetyFlags.mockModeLocked ? "active" : "needs attention",
    detail:
      "Uses fixture portfolio data, mock order tickets, exact confirmation challenges, and local receipts.",
    state: safetyFlags.mockModeLocked ? "ready" : "attention"
  };
}

function buildRobinhoodReadOnlyItem(
  state: ReadinessBrokerState
): ReadinessItem {
  if (state === "available") {
    return {
      id: "robinhood-read-only",
      label: "Robinhood read-only",
      value: "available",
      detail:
        "An externally managed read-only MCP client is detected. Order actions remain unavailable.",
      state: "ready"
    };
  }

  if (state === "fixture_only") {
    return {
      id: "robinhood-read-only",
      label: "Robinhood read-only",
      value: "fixture only",
      detail:
        "Static fixtures are available. No real account data is loaded into StreetSpeak.",
      state: "disabled"
    };
  }

  return {
    id: "robinhood-read-only",
    label: "Robinhood read-only",
    value: state === "unconfigured" ? "unconfigured" : "unavailable",
    detail:
      "No externally managed read-only MCP client is active. Static fixtures still work.",
    state: "unavailable"
  };
}

function buildLiveTradingItem(safetyFlags: DemoSafetyFlags): ReadinessItem {
  return {
    id: "live-trading",
    label: "Live trading",
    value: safetyFlags.liveTradingAvailable ? "available" : "unavailable",
    detail:
      "Live execution is disabled in this app and cannot be enabled from the dashboard.",
    state: safetyFlags.liveTradingAvailable ? "attention" : "unavailable"
  };
}

function buildStorageItem(storageAvailable: boolean): ReadinessItem {
  return {
    id: "storage",
    label: "Storage",
    value: storageAvailable ? "local browser only" : "unavailable",
    detail: storageAvailable
      ? "Onboarding, settings, and redacted audit events stay in this browser."
      : "This browser cannot persist onboarding, settings, or redacted audit events.",
    state: storageAvailable ? "ready" : "attention"
  };
}
