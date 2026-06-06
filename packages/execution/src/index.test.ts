import { describe, expect, it } from "vitest";
import {
  BlockedLiveExecutionGateway,
  DryRunExecutionGateway,
  LIVE_EXECUTION_UNAVAILABLE_MESSAGE,
  ManualHandoffExecutionGateway,
  createExecutionConfig,
  createExecutionReadinessStatus,
  parseExecutionCommand
} from "./index.js";

const FIXED_NOW = new Date("2026-01-01T00:00:00.000Z");

describe("execution infrastructure", () => {
  it("uses safe config defaults with live trading hard-disabled", () => {
    expect(createExecutionConfig()).toEqual({
      liveTradingEnabled: false,
      orderReviewEnabled: false,
      cancelOrderEnabled: false,
      requireExactConfirmation: true,
      allowMarketOrders: false,
      maxOrderNotionalUsd: null,
      killSwitchEnabled: true,
      executionMode: "dry_run"
    });

    expect(createExecutionReadinessStatus()).toMatchObject({
      liveExecutionAvailable: false,
      orderReviewAvailable: false,
      orderPlacementAvailable: false,
      cancelOrderAvailable: false,
      dryRunAvailable: true,
      manualHandoffAvailable: true,
      killSwitchActive: true,
      exactConfirmationRequired: true,
      brokerExecutionFutureGated: true,
      liveModeOptInAvailable: false,
      message: LIVE_EXECUTION_UNAVAILABLE_MESSAGE
    });
  });

  it("parses share-quantity equity commands without making recommendations", () => {
    expect(parseExecutionCommand("buy 5 HOOD")).toEqual({
      kind: "equity_order",
      assetClass: "equity",
      order: {
        symbol: "HOOD",
        side: "buy",
        quantity: 5,
        type: "market",
        timeInForce: "day"
      },
      summary: "BUY 5 HOOD MARKET"
    });
  });

  it("future-gates unsupported options and notional commands", () => {
    expect(parseExecutionCommand("buy 1 HOOD call")).toMatchObject({
      kind: "unsupported",
      assetClass: "option",
      reason: "unsupported_options"
    });
    expect(parseExecutionCommand("buy $500 of HOOD")).toMatchObject({
      kind: "unsupported",
      assetClass: "equity",
      reason: "notional_placeholder"
    });
  });

  it("records lifecycle transitions through dry-run submission only", () => {
    const gateway = new DryRunExecutionGateway({
      now: () => FIXED_NOW,
      idFactory: (prefix) => `${prefix}-1`
    });
    const built = unwrap(
      gateway.buildExecutionPlan({
        transcript: "buy 5 HOOD",
        source: "test",
        id: "plan-1",
        ticketId: "ticket-1",
        now: FIXED_NOW
      })
    );
    const reviewed = unwrap(gateway.runSafetyChecks(built));
    const challenged = unwrap(
      gateway.createConfirmationChallenge(reviewed, {
        id: "challenge-1",
        code: "4827",
        now: FIXED_NOW
      })
    );
    const submitted = unwrap(gateway.submitDryRun(challenged));

    expect(submitted.plan.lifecycle).toEqual([
      "draft",
      "parsed",
      "ticket_created",
      "safety_reviewed",
      "future_broker_review_required",
      "future_live_execution_required",
      "confirmation_challenge_created",
      "dry_run_ready",
      "dry_run_submitted"
    ]);
    expect(submitted.submission).toMatchObject({
      id: "dry-run-1",
      planId: "plan-1",
      ticketId: "ticket-1",
      liveExecutionAvailable: false,
      brokerOrderReviewed: false,
      brokerOrderPlaced: false,
      brokerOrderCanceled: false,
      message: "Dry-run submission recorded. No live broker order was placed."
    });
    expect(submitted.plan.auditTimeline.map((event) => event.type)).toContain(
      "execution.dry_run.submitted"
    );
  });

  it("adds reusable safety gates that all block live execution", () => {
    const gateway = new DryRunExecutionGateway({ now: () => FIXED_NOW });
    const built = unwrap(
      gateway.buildExecutionPlan({
        transcript: "buy 5 HOOD",
        source: "test",
        ticketId: "ticket-1"
      })
    );
    const reviewed = unwrap(gateway.runSafetyChecks(built));

    expect(reviewed.safetyGates.map((gate) => gate.id)).toEqual([
      "live_trading_disabled",
      "order_review_disabled",
      "cancel_order_disabled",
      "per_order_notional_placeholder",
      "ticker_symbol_ambiguity",
      "quote_freshness_placeholder",
      "buying_power_placeholder",
      "tradability_placeholder",
      "market_hours_warning_placeholder",
      "supported_asset_class",
      "unsupported_options_gate",
      "generic_confirmation_rejection",
      "exact_confirmation_phrase_code",
      "kill_switch_emergency_disable",
      "terms_accepted_placeholder",
      "live_mode_opt_in_placeholder",
      "market_orders_disabled"
    ]);
    expect(reviewed.safetyGates.every((gate) => gate.blocksLiveExecution)).toBe(
      true
    );
    expect(reviewed.safetyGates).toContainEqual(
      expect.objectContaining({
        id: "kill_switch_emergency_disable",
        status: "block_live_execution"
      })
    );
  });

  it("requires exact confirmation phrase/code and rejects generic text", () => {
    const gateway = new DryRunExecutionGateway({ now: () => FIXED_NOW });
    const built = unwrap(
      gateway.buildExecutionPlan({
        transcript: "buy 5 HOOD",
        ticketId: "ticket-1",
        now: FIXED_NOW
      })
    );
    const reviewed = unwrap(gateway.runSafetyChecks(built));
    const challenged = unwrap(
      gateway.createConfirmationChallenge(reviewed, {
        id: "challenge-1",
        code: "4827",
        now: FIXED_NOW
      })
    );
    const rejected = unwrap(
      gateway.evaluateConfirmation(challenged, "yes", FIXED_NOW)
    );
    const accepted = unwrap(
      gateway.evaluateConfirmation(
        challenged,
        "CONFIRM MOCK BUY 5 HOOD MARKET CODE 4827",
        FIXED_NOW
      )
    );

    expect(rejected.lifecycle).toContain("confirmation_rejected");
    expect(rejected.confirmation).toEqual({
      accepted: false,
      status: "rejected",
      reason: "generic_confirmation",
      normalizedSpokenText: "yes"
    });
    expect(accepted.lifecycle).toContain("confirmation_accepted");
    expect(accepted.confirmation).toEqual({
      accepted: true,
      status: "accepted_for_mock_only",
      normalizedSpokenText: "confirm mock buy 5 hood market code 4827"
    });
  });

  it("creates manual handoff prompts without broker submission", () => {
    const gateway = new ManualHandoffExecutionGateway({
      now: () => FIXED_NOW,
      idFactory: (prefix) => `${prefix}-1`
    });
    const built = unwrap(
      gateway.buildExecutionPlan({
        transcript: "buy 5 HOOD",
        source: "test",
        ticketId: "ticket-1",
        now: FIXED_NOW
      })
    );
    const reviewed = unwrap(gateway.runSafetyChecks(built));
    const handoff = unwrap(gateway.createManualHandoff(reviewed));

    expect(handoff.plan.lifecycle).toContain("manual_handoff_ready");
    expect(handoff.prompt).toContain("ASK YOUR ROBINHOOD AGENT:");
    expect(handoff.prompt).toContain(
      "Build or review a long equity order to buy 5 shares of HOOD."
    );
    expect(handoff.message).toContain(
      "StreetSpeak did not send this to Robinhood"
    );
    expect(handoff.liveExecutionAvailable).toBe(false);
    expect(handoff.brokerOrderReviewed).toBe(false);
    expect(handoff.brokerOrderPlaced).toBe(false);
    expect(handoff.plan.auditTimeline.map((event) => event.type)).toContain(
      "execution.manual_handoff.created"
    );
  });

  it("blocks live execution attempts with the required fail-closed message", () => {
    const gateway = new DryRunExecutionGateway({ now: () => FIXED_NOW });
    const built = unwrap(
      gateway.buildExecutionPlan({
        transcript: "buy 5 HOOD",
        source: "test",
        ticketId: "ticket-1"
      })
    );
    const blocked = gateway.blockLiveExecution(built);

    expect(blocked).toMatchObject({
      ok: false,
      code: "live_execution_unavailable",
      message: LIVE_EXECUTION_UNAVAILABLE_MESSAGE
    });
    expect(blocked.plan?.lifecycle).toContain("blocked_live_execution");
    expect(blocked.plan?.auditTimeline.map((event) => event.type)).toContain(
      "execution.live.blocked"
    );
  });

  it("makes the blocked live gateway fail closed for every method", () => {
    const gateway = new BlockedLiveExecutionGateway();
    const buildResult = gateway.buildExecutionPlan({
      transcript: "buy 5 HOOD",
      source: "test",
      now: FIXED_NOW
    });

    expect(buildResult).toMatchObject({
      ok: false,
      code: "live_execution_unavailable",
      message: LIVE_EXECUTION_UNAVAILABLE_MESSAGE
    });

    if (buildResult.ok) {
      throw new Error("blocked build should fail closed");
    }

    const plan = buildResult.plan;

    if (!plan) {
      throw new Error(
        "blocked build should return a redacted placeholder plan"
      );
    }

    expect(gateway.runSafetyChecks(plan)).toMatchObject({
      ok: false,
      message: LIVE_EXECUTION_UNAVAILABLE_MESSAGE
    });
    expect(gateway.createConfirmationChallenge(plan)).toMatchObject({
      ok: false,
      message: LIVE_EXECUTION_UNAVAILABLE_MESSAGE
    });
    expect(gateway.evaluateConfirmation(plan, "anything")).toMatchObject({
      ok: false,
      message: LIVE_EXECUTION_UNAVAILABLE_MESSAGE
    });
    expect(gateway.submitDryRun(plan)).toMatchObject({
      ok: false,
      message: LIVE_EXECUTION_UNAVAILABLE_MESSAGE
    });
    expect(gateway.createManualHandoff(plan)).toMatchObject({
      ok: false,
      message: LIVE_EXECUTION_UNAVAILABLE_MESSAGE
    });
  });
});

function unwrap<T>(
  result:
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly message: string }
): T {
  if (!result.ok) {
    throw new Error(result.message);
  }

  return result.value;
}
