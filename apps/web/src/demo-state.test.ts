import { describe, expect, it } from "vitest";
import {
  createAuditEvent,
  NO_LIVE_BROKER_ORDER_PLACED_STATEMENT
} from "@streetspeak-ai/audit";
import {
  appendAuditEvent,
  appendAuditEvents,
  clearAuditTimeline,
  DEFAULT_DEMO_SETTINGS,
  exportAuditTimeline,
  getDemoSafetyFlags,
  hasAcceptedOnboarding,
  loadAuditTimeline,
  loadDemoSettings,
  loadOnboardingAcceptance,
  resetAllDemoData,
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

  has(key: string): boolean {
    return this.#items.has(key);
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

  it("persists redacted audit events in local browser storage", () => {
    const storage = new MemoryStorage();
    const event = createAuditEvent(
      "command.received",
      {
        transcript: "buy 5 HOOD",
        accountId: "acct-id",
        rawAudio: "audio-bytes"
      },
      {
        id: "audit-1",
        now: new Date("2026-01-01T00:00:00.000Z")
      }
    );

    expect(appendAuditEvent(storage, event)).toEqual([
      {
        id: "audit-1",
        type: "command.received",
        occurredAt: "2026-01-01T00:00:00.000Z",
        actor: "system",
        redacted: true,
        payload: {
          transcript: "buy 5 HOOD",
          accountId: "[REDACTED]",
          rawAudio: "[REDACTED]"
        }
      }
    ]);
    expect(loadAuditTimeline(storage)).toHaveLength(1);
  });

  it("appends audit events without duplicating existing event ids", () => {
    const storage = new MemoryStorage();
    const event = createAuditEvent(
      "command.routed",
      { intent: "unknown" },
      {
        id: "audit-1"
      }
    );

    appendAuditEvents(storage, [event]);
    appendAuditEvents(storage, [event]);

    expect(loadAuditTimeline(storage)).toHaveLength(1);
  });

  it("clears and exports the local audit timeline", () => {
    const storage = new MemoryStorage();

    appendAuditEvent(
      storage,
      createAuditEvent(
        "safety.reviewed",
        { liveTradingEnabled: false },
        {
          id: "audit-1",
          now: new Date("2026-01-01T00:00:00.000Z")
        }
      )
    );

    expect(
      exportAuditTimeline(storage, {
        now: new Date("2026-01-01T00:01:00.000Z")
      })
    ).toEqual({
      kind: "audit_timeline_export",
      generatedAt: "2026-01-01T00:01:00.000Z",
      source: "local_browser",
      mockOnly: true,
      liveTradingEnabled: false,
      rawAudioIncluded: false,
      secretFieldsRedacted: true,
      statement: NO_LIVE_BROKER_ORDER_PLACED_STATEMENT,
      events: [
        {
          id: "audit-1",
          type: "safety.reviewed",
          occurredAt: "2026-01-01T00:00:00.000Z",
          actor: "system",
          redacted: true,
          payload: {
            liveTradingEnabled: false
          }
        }
      ]
    });

    clearAuditTimeline(storage);

    expect(loadAuditTimeline(storage)).toEqual([]);
  });

  it("resets all local demo data including onboarding, settings, and audit", () => {
    const storage = new MemoryStorage();

    saveOnboardingAcceptance(storage);
    saveDemoSettings(storage, {
      browserVoiceInputEnabled: false,
      showAuditTimeline: false
    });
    storage.setItem("streetspeak-ai:last-command:v1", "buy 5 HOOD");
    appendAuditEvent(
      storage,
      createAuditEvent("command.received", { transcript: "buy 5 HOOD" })
    );

    expect(resetAllDemoData(storage)).toEqual({
      commandText: "",
      confirmationText: "",
      lastVoiceTranscript: ""
    });
    expect(hasAcceptedOnboarding(storage)).toBe(false);
    expect(loadDemoSettings(storage)).toEqual(DEFAULT_DEMO_SETTINGS);
    expect(loadAuditTimeline(storage)).toEqual([]);
    expect(storage.has("streetspeak-ai:last-command:v1")).toBe(false);
  });
});
