export const ONBOARDING_VERSION = "ssai-local-demo-v1";

export type OnboardingAcknowledgementId =
  | "not_investment_advice"
  | "not_affiliated"
  | "mock_only"
  | "no_live_order"
  | "ai_can_make_mistakes"
  | "review_every_ticket";

export interface OnboardingAcknowledgement {
  readonly id: OnboardingAcknowledgementId;
  readonly label: string;
}

export interface OnboardingAcceptance {
  readonly accepted: true;
  readonly version: typeof ONBOARDING_VERSION;
  readonly acceptedAt: string;
  readonly storage: "local_browser";
  readonly acknowledgements: readonly OnboardingAcknowledgementId[];
}

export interface DemoSettings {
  readonly browserVoiceInputEnabled: boolean;
  readonly showAuditTimeline: boolean;
}

export interface DemoRuntimeState {
  readonly commandText: string;
  readonly confirmationText: string;
  readonly lastVoiceTranscript: string;
}

export interface DemoSafetyFlags {
  readonly mockModeLocked: true;
  readonly liveTradingEnabled: false;
  readonly liveTradingAvailable: false;
}

export interface LocalDemoStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const REQUIRED_ONBOARDING_ACKNOWLEDGEMENTS: readonly OnboardingAcknowledgement[] =
  [
    {
      id: "not_investment_advice",
      label: "StreetSpeak AI is not investment advice."
    },
    {
      id: "not_affiliated",
      label:
        "StreetSpeak AI is not affiliated with Robinhood, Public, ElevenLabs, or any broker."
    },
    {
      id: "mock_only",
      label: "The current version is mock-only."
    },
    {
      id: "no_live_order",
      label: "No live broker order will be placed."
    },
    {
      id: "ai_can_make_mistakes",
      label: "AI, transcription, and parsing can make mistakes."
    },
    {
      id: "review_every_ticket",
      label: "I must review every ticket and confirmation."
    }
  ];

export const DEFAULT_DEMO_SETTINGS: DemoSettings = {
  browserVoiceInputEnabled: true,
  showAuditTimeline: true
};

export const DEMO_SAFETY_FLAGS: DemoSafetyFlags = {
  mockModeLocked: true,
  liveTradingEnabled: false,
  liveTradingAvailable: false
};

const ONBOARDING_STORAGE_KEY = "streetspeak-ai:onboarding:v1";
const SETTINGS_STORAGE_KEY = "streetspeak-ai:settings:v1";
const TRANSIENT_DEMO_STORAGE_KEYS = [
  "streetspeak-ai:last-command:v1",
  "streetspeak-ai:last-confirmation:v1",
  "streetspeak-ai:last-voice-transcript:v1"
] as const;

export function getBrowserLocalStorage(): LocalDemoStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadOnboardingAcceptance(
  storage: LocalDemoStorage | null
): OnboardingAcceptance | null {
  if (!storage) {
    return null;
  }

  const raw = storage.getItem(ONBOARDING_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingAcceptance>;

    if (!isValidOnboardingAcceptance(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function hasAcceptedOnboarding(
  storage: LocalDemoStorage | null
): boolean {
  return loadOnboardingAcceptance(storage) !== null;
}

export function saveOnboardingAcceptance(
  storage: LocalDemoStorage | null,
  options: { readonly now?: Date } = {}
): OnboardingAcceptance | null {
  if (!storage) {
    return null;
  }

  const acceptance: OnboardingAcceptance = {
    accepted: true,
    version: ONBOARDING_VERSION,
    acceptedAt: (options.now ?? new Date()).toISOString(),
    storage: "local_browser",
    acknowledgements: REQUIRED_ONBOARDING_ACKNOWLEDGEMENTS.map(
      (acknowledgement) => acknowledgement.id
    )
  };

  storage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(acceptance));

  return acceptance;
}

export function resetOnboardingAcceptance(
  storage: LocalDemoStorage | null
): void {
  storage?.removeItem(ONBOARDING_STORAGE_KEY);
}

export function loadDemoSettings(
  storage: LocalDemoStorage | null
): DemoSettings {
  if (!storage) {
    return DEFAULT_DEMO_SETTINGS;
  }

  const raw = storage.getItem(SETTINGS_STORAGE_KEY);

  if (!raw) {
    return DEFAULT_DEMO_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DemoSettings>;

    return normalizeDemoSettings(parsed);
  } catch {
    return DEFAULT_DEMO_SETTINGS;
  }
}

export function saveDemoSettings(
  storage: LocalDemoStorage | null,
  settings: DemoSettings
): DemoSettings {
  const normalized = normalizeDemoSettings(settings);

  storage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));

  return normalized;
}

export function createDefaultDemoRuntimeState(): DemoRuntimeState {
  return {
    commandText: "",
    confirmationText: "",
    lastVoiceTranscript: ""
  };
}

export function resetDemoState(
  storage: LocalDemoStorage | null
): DemoRuntimeState {
  for (const key of TRANSIENT_DEMO_STORAGE_KEYS) {
    storage?.removeItem(key);
  }

  return createDefaultDemoRuntimeState();
}

export function getDemoSafetyFlags(): DemoSafetyFlags {
  return DEMO_SAFETY_FLAGS;
}

function normalizeDemoSettings(candidate: Partial<DemoSettings>): DemoSettings {
  return {
    browserVoiceInputEnabled:
      typeof candidate.browserVoiceInputEnabled === "boolean"
        ? candidate.browserVoiceInputEnabled
        : DEFAULT_DEMO_SETTINGS.browserVoiceInputEnabled,
    showAuditTimeline:
      typeof candidate.showAuditTimeline === "boolean"
        ? candidate.showAuditTimeline
        : DEFAULT_DEMO_SETTINGS.showAuditTimeline
  };
}

function isValidOnboardingAcceptance(
  candidate: Partial<OnboardingAcceptance>
): candidate is OnboardingAcceptance {
  return (
    candidate.accepted === true &&
    candidate.version === ONBOARDING_VERSION &&
    candidate.storage === "local_browser" &&
    typeof candidate.acceptedAt === "string" &&
    Array.isArray(candidate.acknowledgements) &&
    REQUIRED_ONBOARDING_ACKNOWLEDGEMENTS.every((acknowledgement) =>
      candidate.acknowledgements?.includes(acknowledgement.id)
    )
  );
}
