import { describe, expect, it } from "vitest";
import {
  DEFAULT_DEMO_SETTINGS,
  getDemoSafetyFlags,
  hasAcceptedOnboarding,
  loadDemoSettings,
  loadOnboardingAcceptance,
  resetDemoState,
  resetOnboardingAcceptance,
  saveDemoSettings,
  saveOnboardingAcceptance
} from "./demo-state";

class MemoryStorage {
  readonly #items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.#items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.#items.set(key, value);
  }

  removeItem(key: string): void {
    this.#items.delete(key);
  }
}

describe("local demo state", () => {
  it("stores onboarding acceptance locally with all required acknowledgements", () => {
    const storage = new MemoryStorage();
    const acceptance = saveOnboardingAcceptance(storage, {
      now: new Date("2026-01-01T00:00:00.000Z")
    });

    expect(acceptance).toMatchObject({
      accepted: true,
      acceptedAt: "2026-01-01T00:00:00.000Z",
      storage: "local_browser"
    });
    expect(acceptance?.acknowledgements).toEqual([
      "not_investment_advice",
      "not_affiliated",
      "mock_only",
      "no_live_order",
      "ai_can_make_mistakes",
      "review_every_ticket"
    ]);
    expect(hasAcceptedOnboarding(storage)).toBe(true);
    expect(loadOnboardingAcceptance(storage)).toEqual(acceptance);
  });

  it("resets onboarding acceptance without creating an account or server state", () => {
    const storage = new MemoryStorage();

    saveOnboardingAcceptance(storage);
    resetOnboardingAcceptance(storage);

    expect(hasAcceptedOnboarding(storage)).toBe(false);
  });

  it("uses local settings defaults and normalizes stored settings", () => {
    const storage = new MemoryStorage();

    expect(loadDemoSettings(storage)).toEqual(DEFAULT_DEMO_SETTINGS);
    expect(
      saveDemoSettings(storage, {
        browserVoiceInputEnabled: false,
        showAuditTimeline: false
      })
    ).toEqual({
      browserVoiceInputEnabled: false,
      showAuditTimeline: false
    });
    expect(loadDemoSettings(storage)).toEqual({
      browserVoiceInputEnabled: false,
      showAuditTimeline: false
    });
  });

  it("resets transient demo state without changing live-trading flags", () => {
    const storage = new MemoryStorage();

    storage.setItem("streetspeak-ai:last-command:v1", "buy 5 HOOD");
    storage.setItem("streetspeak-ai:last-confirmation:v1", "yes");

    expect(resetDemoState(storage)).toEqual({
      commandText: "",
      confirmationText: "",
      lastVoiceTranscript: ""
    });
    expect(storage.getItem("streetspeak-ai:last-command:v1")).toBeNull();
    expect(storage.getItem("streetspeak-ai:last-confirmation:v1")).toBeNull();
    expect(getDemoSafetyFlags()).toEqual({
      mockModeLocked: true,
      liveTradingEnabled: false,
      liveTradingAvailable: false
    });
  });
});
