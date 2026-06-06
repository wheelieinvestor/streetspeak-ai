import {
  createAuditEvent,
  NO_LIVE_BROKER_ORDER_PLACED_STATEMENT,
  type AuditEvent,
  type AuditEventActor
} from "@streetspeak-ai/audit";
import {
  createEquityOrderTicket,
  type EquityOrderSide,
  type EquityOrderTicket,
  type EquityOrderTicketInput,
  type EquityOrderType
} from "@streetspeak-ai/orders";
import {
  createConfirmationChallenge as createSafetyConfirmationChallenge,
  evaluateConfirmationChallenge,
  type ConfirmationChallenge,
  type ConfirmationEvaluation
} from "@streetspeak-ai/safety";

export const LIVE_EXECUTION_UNAVAILABLE_MESSAGE =
  "Live execution is unavailable in this build.";

export type ExecutionLifecycleState =
  | "draft"
  | "parsed"
  | "ticket_created"
  | "safety_reviewed"
  | "confirmation_challenge_created"
  | "confirmation_rejected"
  | "confirmation_accepted"
  | "dry_run_ready"
  | "dry_run_submitted"
  | "manual_handoff_ready"
  | "blocked_live_execution"
  | "future_broker_review_required"
  | "future_live_execution_required";

export type ExecutionMode =
  | "mock"
  | "dry_run"
  | "manual_handoff"
  | "blocked_live";

export interface ExecutionConfig {
  readonly liveTradingEnabled: false;
  readonly orderReviewEnabled: false;
  readonly cancelOrderEnabled: false;
  readonly requireExactConfirmation: true;
  readonly allowMarketOrders: false;
  readonly maxOrderNotionalUsd: number | null;
  readonly killSwitchEnabled: true;
  readonly executionMode: ExecutionMode;
}

export interface ExecutionConfigOptions {
  readonly executionMode?: ExecutionMode;
  readonly maxOrderNotionalUsd?: number | null;
}

export type ExecutionSafetyGateId =
  | "live_trading_disabled"
  | "order_review_disabled"
  | "cancel_order_disabled"
  | "per_order_notional_placeholder"
  | "ticker_symbol_ambiguity"
  | "quote_freshness_placeholder"
  | "buying_power_placeholder"
  | "tradability_placeholder"
  | "market_hours_warning_placeholder"
  | "supported_asset_class"
  | "unsupported_options_gate"
  | "generic_confirmation_rejection"
  | "exact_confirmation_phrase_code"
  | "kill_switch_emergency_disable"
  | "terms_accepted_placeholder"
  | "live_mode_opt_in_placeholder"
  | "market_orders_disabled";

export type ExecutionSafetyGateStatus =
  | "pass_for_dry_run"
  | "warning_for_dry_run"
  | "block_live_execution";

export interface ExecutionSafetyGate {
  readonly id: ExecutionSafetyGateId;
  readonly label: string;
  readonly status: ExecutionSafetyGateStatus;
  readonly blocksLiveExecution: true;
  readonly message: string;
}

export type ExecutionAssetClass = "equity" | "option" | "unknown";

export type ExecutionParseResult =
  | {
      readonly kind: "equity_order";
      readonly assetClass: "equity";
      readonly order: EquityOrderTicketInput;
      readonly summary: string;
    }
  | {
      readonly kind: "unsupported";
      readonly assetClass: ExecutionAssetClass;
      readonly reason:
        | "empty_command"
        | "ambiguous_order"
        | "missing_order_details"
        | "notional_placeholder"
        | "unsupported_options"
        | "invalid_limit_price";
      readonly message: string;
    };

export interface ExecutionPlan {
  readonly id: string;
  readonly transcript: string;
  readonly source: ExecutionPlanSource;
  readonly createdAt: string;
  readonly config: ExecutionConfig;
  readonly parse: ExecutionParseResult;
  readonly ticket?: EquityOrderTicket;
  readonly lifecycle: readonly ExecutionLifecycleState[];
  readonly safetyGates: readonly ExecutionSafetyGate[];
  readonly liveExecutionBlocked: true;
  readonly brokerOrderReviewed: false;
  readonly brokerOrderPlaced: false;
  readonly brokerOrderCanceled: false;
  readonly statement: typeof NO_LIVE_BROKER_ORDER_PLACED_STATEMENT;
  readonly challenge?: ConfirmationChallenge;
  readonly confirmation?: ConfirmationEvaluation;
  readonly auditTimeline: readonly AuditEvent[];
}

export type ExecutionPlanSource = "cli" | "web" | "api" | "test";

export interface BuildExecutionPlanRequest {
  readonly transcript: string;
  readonly source?: ExecutionPlanSource;
  readonly id?: string;
  readonly ticketId?: string;
  readonly now?: Date;
}

export interface ConfirmationChallengeRequest {
  readonly id?: string;
  readonly code?: string;
  readonly now?: Date;
  readonly expiresAt?: Date;
}

export interface ExecutionDryRunSubmission {
  readonly id: string;
  readonly planId: string;
  readonly ticketId: string;
  readonly submittedAt: string;
  readonly lifecycleState: "dry_run_submitted";
  readonly liveExecutionAvailable: false;
  readonly brokerOrderReviewed: false;
  readonly brokerOrderPlaced: false;
  readonly brokerOrderCanceled: false;
  readonly message: string;
  readonly statement: typeof NO_LIVE_BROKER_ORDER_PLACED_STATEMENT;
}

export interface ExecutionDryRunResult {
  readonly plan: ExecutionPlan;
  readonly submission: ExecutionDryRunSubmission;
}

export interface ExecutionManualHandoff {
  readonly plan: ExecutionPlan;
  readonly prompt: string;
  readonly message: string;
  readonly liveExecutionAvailable: false;
  readonly brokerOrderReviewed: false;
  readonly brokerOrderPlaced: false;
  readonly brokerOrderCanceled: false;
  readonly statement: typeof NO_LIVE_BROKER_ORDER_PLACED_STATEMENT;
}

export interface ExecutionGatewayFailure {
  readonly ok: false;
  readonly code:
    | "invalid_execution_command"
    | "ticket_unavailable"
    | "confirmation_unavailable"
    | "live_execution_unavailable";
  readonly message: string;
  readonly plan?: ExecutionPlan;
}

export type ExecutionGatewayResult<T> =
  | {
      readonly ok: true;
      readonly value: T;
    }
  | ExecutionGatewayFailure;

export interface ExecutionGateway {
  buildExecutionPlan(
    request: BuildExecutionPlanRequest
  ): ExecutionGatewayResult<ExecutionPlan>;
  runSafetyChecks(plan: ExecutionPlan): ExecutionGatewayResult<ExecutionPlan>;
  createConfirmationChallenge(
    plan: ExecutionPlan,
    request?: ConfirmationChallengeRequest
  ): ExecutionGatewayResult<ExecutionPlan>;
  evaluateConfirmation(
    plan: ExecutionPlan,
    confirmationText: string,
    now?: Date
  ): ExecutionGatewayResult<ExecutionPlan>;
  submitDryRun(
    plan: ExecutionPlan
  ): ExecutionGatewayResult<ExecutionDryRunResult>;
  createManualHandoff(
    plan: ExecutionPlan
  ): ExecutionGatewayResult<ExecutionManualHandoff>;
  blockLiveExecution(plan?: ExecutionPlan): ExecutionGatewayFailure;
}

export interface ExecutionGatewayOptions {
  readonly config?: ExecutionConfigOptions;
  readonly now?: () => Date;
  readonly idFactory?: (prefix: string) => string;
}

export interface ExecutionReadinessStatus {
  readonly liveExecutionAvailable: false;
  readonly orderReviewAvailable: false;
  readonly orderPlacementAvailable: false;
  readonly cancelOrderAvailable: false;
  readonly dryRunAvailable: true;
  readonly manualHandoffAvailable: true;
  readonly killSwitchActive: true;
  readonly exactConfirmationRequired: true;
  readonly brokerExecutionFutureGated: true;
  readonly liveModeOptInAvailable: false;
  readonly message: typeof LIVE_EXECUTION_UNAVAILABLE_MESSAGE;
  readonly config: ExecutionConfig;
}

const SHARE_ORDER_PATTERN =
  /\b(?<side>buy|sell)\s+(?<quantity>\d+)\s+(?<symbol>[a-z][a-z0-9.]{0,9})\b/giu;

const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  liveTradingEnabled: false,
  orderReviewEnabled: false,
  cancelOrderEnabled: false,
  requireExactConfirmation: true,
  allowMarketOrders: false,
  maxOrderNotionalUsd: null,
  killSwitchEnabled: true,
  executionMode: "dry_run"
};

export function createExecutionConfig(
  options: ExecutionConfigOptions = {}
): ExecutionConfig {
  return {
    ...DEFAULT_EXECUTION_CONFIG,
    ...(options.executionMode === undefined
      ? {}
      : { executionMode: options.executionMode }),
    ...(options.maxOrderNotionalUsd === undefined
      ? {}
      : { maxOrderNotionalUsd: options.maxOrderNotionalUsd })
  };
}

export function createExecutionReadinessStatus(
  config: ExecutionConfig = createExecutionConfig()
): ExecutionReadinessStatus {
  return {
    liveExecutionAvailable: false,
    orderReviewAvailable: false,
    orderPlacementAvailable: false,
    cancelOrderAvailable: false,
    dryRunAvailable: true,
    manualHandoffAvailable: true,
    killSwitchActive: config.killSwitchEnabled,
    exactConfirmationRequired: config.requireExactConfirmation,
    brokerExecutionFutureGated: true,
    liveModeOptInAvailable: false,
    message: LIVE_EXECUTION_UNAVAILABLE_MESSAGE,
    config
  };
}

export function parseExecutionCommand(
  transcript: string
): ExecutionParseResult {
  const normalized = transcript.trim().toLowerCase();

  if (!normalized) {
    return {
      kind: "unsupported",
      assetClass: "unknown",
      reason: "empty_command",
      message: "Provide a share-quantity equity command such as buy 5 HOOD."
    };
  }

  if (hasOptionsLanguage(normalized)) {
    return {
      kind: "unsupported",
      assetClass: "option",
      reason: "unsupported_options",
      message:
        "Options execution is unsupported and future-gated. No options ticket, broker review, or live execution was created."
    };
  }

  if (hasNotionalOrder(normalized)) {
    return {
      kind: "unsupported",
      assetClass: "equity",
      reason: "notional_placeholder",
      message:
        "Notional orders are future-gated. Quote conversion, estimated shares, and explicit confirmation must exist before a final ticket can be created."
    };
  }

  const matches = [...normalized.matchAll(SHARE_ORDER_PATTERN)];
  SHARE_ORDER_PATTERN.lastIndex = 0;

  if (matches.length > 1) {
    return {
      kind: "unsupported",
      assetClass: "equity",
      reason: "ambiguous_order",
      message: "StreetSpeak can build only one execution plan at a time."
    };
  }

  const match = matches[0];

  if (!match?.groups) {
    return {
      kind: "unsupported",
      assetClass: "unknown",
      reason: "missing_order_details",
      message:
        "Use a share-quantity equity command such as buy 5 HOOD or build a limit order to buy 3 AAPL at 175."
    };
  }

  const rawSide = match.groups.side;
  const rawQuantity = match.groups.quantity;
  const rawSymbol = match.groups.symbol;

  if (!rawSide || !rawQuantity || !rawSymbol) {
    return {
      kind: "unsupported",
      assetClass: "unknown",
      reason: "missing_order_details",
      message:
        "Use a share-quantity equity command such as buy 5 HOOD or build a limit order to buy 3 AAPL at 175."
    };
  }

  const limitPrice = parseLimitPrice(normalized);

  if (limitPrice === "invalid") {
    return {
      kind: "unsupported",
      assetClass: "equity",
      reason: "invalid_limit_price",
      message: "Limit orders require a positive numeric limit price."
    };
  }

  const type: EquityOrderType =
    limitPrice !== undefined || /\blimit\b/u.test(normalized)
      ? "limit"
      : "market";

  if (type === "limit" && limitPrice === undefined) {
    return {
      kind: "unsupported",
      assetClass: "equity",
      reason: "invalid_limit_price",
      message: "Limit orders require a positive numeric limit price."
    };
  }

  const side = rawSide as EquityOrderSide;
  const quantity = Number.parseInt(rawQuantity, 10);
  const symbol = rawSymbol.toUpperCase();
  const order: EquityOrderTicketInput = {
    symbol,
    side,
    quantity,
    type,
    ...(limitPrice === undefined ? {} : { limitPrice }),
    timeInForce: "day"
  };

  return {
    kind: "equity_order",
    assetClass: "equity",
    order,
    summary:
      type === "limit"
        ? `${side.toUpperCase()} ${quantity} ${symbol} LIMIT ${limitPrice}`
        : `${side.toUpperCase()} ${quantity} ${symbol} MARKET`
  };
}

export class DryRunExecutionGateway implements ExecutionGateway {
  protected readonly config: ExecutionConfig;
  protected readonly now: () => Date;
  protected readonly idFactory: (prefix: string) => string;

  constructor(options: ExecutionGatewayOptions = {}) {
    this.config = createExecutionConfig({
      ...options.config,
      executionMode: options.config?.executionMode ?? "dry_run"
    });
    this.now = options.now ?? (() => new Date());
    this.idFactory = options.idFactory ?? createMockId;
  }

  buildExecutionPlan(
    request: BuildExecutionPlanRequest
  ): ExecutionGatewayResult<ExecutionPlan> {
    const now = request.now ?? this.now();
    const parse = parseExecutionCommand(request.transcript);
    const auditTimeline: AuditEvent[] = [];
    const lifecycle: ExecutionLifecycleState[] = ["draft", "parsed"];
    let ticket: EquityOrderTicket | undefined;

    if (parse.kind === "equity_order") {
      const ticketResult = createEquityOrderTicket(parse.order, {
        id: request.ticketId,
        now
      });

      if ("validation" in ticketResult) {
        return {
          ok: false,
          code: "invalid_execution_command",
          message: ticketResult.validation.errors.join("; ")
        };
      }

      ticket = ticketResult.ticket;
      lifecycle.push("ticket_created");
    }

    const plan: ExecutionPlan = {
      id: request.id ?? this.idFactory("execution-plan"),
      transcript: request.transcript,
      source: request.source ?? "api",
      createdAt: now.toISOString(),
      config: this.config,
      parse,
      ...(ticket === undefined ? {} : { ticket }),
      lifecycle,
      safetyGates: [],
      liveExecutionBlocked: true,
      brokerOrderReviewed: false,
      brokerOrderPlaced: false,
      brokerOrderCanceled: false,
      statement: NO_LIVE_BROKER_ORDER_PLACED_STATEMENT,
      auditTimeline
    };

    return {
      ok: true,
      value: appendAudit(plan, "execution.plan.created", {
        planId: plan.id,
        source: plan.source,
        parseKind: parse.kind,
        assetClass: parse.assetClass,
        ticketId: ticket?.id,
        brokerOrderReviewed: false,
        brokerOrderPlaced: false,
        brokerOrderCanceled: false,
        liveTradingEnabled: false
      })
    };
  }

  runSafetyChecks(plan: ExecutionPlan): ExecutionGatewayResult<ExecutionPlan> {
    const safetyGates = createExecutionSafetyGates(plan);
    const reviewedPlan = {
      ...plan,
      safetyGates,
      lifecycle: appendLifecycleStates(plan.lifecycle, [
        "safety_reviewed",
        "future_broker_review_required",
        "future_live_execution_required"
      ])
    };

    return {
      ok: true,
      value: appendAudit(reviewedPlan, "execution.safety.blocked", {
        planId: reviewedPlan.id,
        ticketId: reviewedPlan.ticket?.id,
        gateIds: safetyGates.map((gate) => gate.id),
        liveExecutionBlocked: true,
        dryRunAllowed: reviewedPlan.ticket !== undefined,
        manualHandoffAllowed: reviewedPlan.ticket !== undefined,
        message: LIVE_EXECUTION_UNAVAILABLE_MESSAGE
      })
    };
  }

  createConfirmationChallenge(
    plan: ExecutionPlan,
    request: ConfirmationChallengeRequest = {}
  ): ExecutionGatewayResult<ExecutionPlan> {
    if (!plan.ticket) {
      return {
        ok: false,
        code: "ticket_unavailable",
        message:
          "No equity order ticket is available for a confirmation challenge.",
        plan
      };
    }

    const now = request.now ?? this.now();
    const challenge = createSafetyConfirmationChallenge(plan.ticket, {
      id: request.id,
      code: request.code,
      now,
      expiresAt: request.expiresAt
    });
    const challengedPlan = {
      ...plan,
      challenge,
      lifecycle: appendLifecycleStates(plan.lifecycle, [
        "confirmation_challenge_created"
      ])
    };

    return {
      ok: true,
      value: appendAudit(challengedPlan, "execution.confirmation.required", {
        planId: plan.id,
        ticketId: plan.ticket.id,
        challengeId: challenge.id,
        requiredPhrase: challenge.requiredPhrase,
        requireExactConfirmation: true,
        genericConfirmationsRejected: true
      })
    };
  }

  evaluateConfirmation(
    plan: ExecutionPlan,
    confirmationText: string,
    now: Date = this.now()
  ): ExecutionGatewayResult<ExecutionPlan> {
    if (!plan.challenge) {
      return {
        ok: false,
        code: "confirmation_unavailable",
        message: "No execution confirmation challenge is available.",
        plan
      };
    }

    const confirmation = evaluateConfirmationChallenge(
      plan.challenge,
      confirmationText,
      now
    );
    const lifecycleState: ExecutionLifecycleState = confirmation.accepted
      ? "confirmation_accepted"
      : "confirmation_rejected";
    const nextPlan = {
      ...plan,
      confirmation,
      challenge: {
        ...plan.challenge,
        status: confirmation.status
      },
      lifecycle: appendLifecycleStates(plan.lifecycle, [lifecycleState])
    };

    const auditPayload: Record<string, unknown> = {
      planId: plan.id,
      ticketId: plan.ticket?.id,
      challengeId: plan.challenge.id,
      accepted: confirmation.accepted,
      normalizedSpokenText: confirmation.normalizedSpokenText,
      rawAudioStored: false
    };

    if ("reason" in confirmation) {
      auditPayload.reason = confirmation.reason;
    }

    return {
      ok: true,
      value: appendAudit(
        nextPlan,
        confirmation.accepted
          ? "confirmation.accepted"
          : "confirmation.rejected",
        auditPayload
      )
    };
  }

  submitDryRun(
    plan: ExecutionPlan
  ): ExecutionGatewayResult<ExecutionDryRunResult> {
    if (!plan.ticket) {
      return {
        ok: false,
        code: "ticket_unavailable",
        message: "No equity order ticket is available for dry-run submission.",
        plan
      };
    }

    const now = this.now();
    const submission: ExecutionDryRunSubmission = {
      id: this.idFactory("dry-run"),
      planId: plan.id,
      ticketId: plan.ticket.id,
      submittedAt: now.toISOString(),
      lifecycleState: "dry_run_submitted",
      liveExecutionAvailable: false,
      brokerOrderReviewed: false,
      brokerOrderPlaced: false,
      brokerOrderCanceled: false,
      message: "Dry-run submission recorded. No live broker order was placed.",
      statement: NO_LIVE_BROKER_ORDER_PLACED_STATEMENT
    };
    const nextPlan = appendAudit(
      {
        ...plan,
        lifecycle: appendLifecycleStates(plan.lifecycle, [
          "dry_run_ready",
          "dry_run_submitted"
        ])
      },
      "execution.dry_run.submitted",
      {
        planId: plan.id,
        ticketId: plan.ticket.id,
        dryRunId: submission.id,
        liveExecutionAvailable: false,
        brokerOrderReviewed: false,
        brokerOrderPlaced: false,
        brokerOrderCanceled: false,
        message: submission.message
      },
      "mock_broker"
    );

    return {
      ok: true,
      value: {
        plan: nextPlan,
        submission
      }
    };
  }

  createManualHandoff(
    plan: ExecutionPlan
  ): ExecutionGatewayResult<ExecutionManualHandoff> {
    if (!plan.ticket) {
      return {
        ok: false,
        code: "ticket_unavailable",
        message: "No equity order ticket is available for manual handoff.",
        plan
      };
    }

    const prompt = createManualHandoffPrompt(plan.ticket);
    const nextPlan = appendAudit(
      {
        ...plan,
        lifecycle: appendLifecycleStates(plan.lifecycle, [
          "future_broker_review_required",
          "manual_handoff_ready"
        ])
      },
      "execution.manual_handoff.created",
      {
        planId: plan.id,
        ticketId: plan.ticket.id,
        promptType: "manual_robinhood_agent",
        brokerOrderReviewed: false,
        brokerOrderPlaced: false,
        brokerOrderCanceled: false
      }
    );

    return {
      ok: true,
      value: {
        plan: nextPlan,
        prompt,
        message:
          "Manual handoff created. StreetSpeak did not send this to Robinhood, did not review the order, and did not place an order.",
        liveExecutionAvailable: false,
        brokerOrderReviewed: false,
        brokerOrderPlaced: false,
        brokerOrderCanceled: false,
        statement: NO_LIVE_BROKER_ORDER_PLACED_STATEMENT
      }
    };
  }

  blockLiveExecution(plan?: ExecutionPlan): ExecutionGatewayFailure {
    return createLiveExecutionFailure(plan);
  }
}

export class ManualHandoffExecutionGateway extends DryRunExecutionGateway {
  constructor(options: ExecutionGatewayOptions = {}) {
    super({
      ...options,
      config: {
        ...options.config,
        executionMode: "manual_handoff"
      }
    });
  }
}

export class BlockedLiveExecutionGateway implements ExecutionGateway {
  buildExecutionPlan(
    request: BuildExecutionPlanRequest
  ): ExecutionGatewayResult<ExecutionPlan> {
    const plan = createBlockedPlaceholderPlan(request);

    return createLiveExecutionFailure(plan);
  }

  runSafetyChecks(plan: ExecutionPlan): ExecutionGatewayResult<ExecutionPlan> {
    return createLiveExecutionFailure(plan);
  }

  createConfirmationChallenge(
    plan: ExecutionPlan
  ): ExecutionGatewayResult<ExecutionPlan> {
    return createLiveExecutionFailure(plan);
  }

  evaluateConfirmation(
    plan: ExecutionPlan,
    confirmationText?: string,
    now?: Date
  ): ExecutionGatewayResult<ExecutionPlan> {
    void confirmationText;
    void now;
    return createLiveExecutionFailure(plan);
  }

  submitDryRun(
    plan: ExecutionPlan
  ): ExecutionGatewayResult<ExecutionDryRunResult> {
    return createLiveExecutionFailure(plan);
  }

  createManualHandoff(
    plan: ExecutionPlan
  ): ExecutionGatewayResult<ExecutionManualHandoff> {
    return createLiveExecutionFailure(plan);
  }

  blockLiveExecution(plan?: ExecutionPlan): ExecutionGatewayFailure {
    return createLiveExecutionFailure(plan);
  }
}

function createExecutionSafetyGates(
  plan: ExecutionPlan
): readonly ExecutionSafetyGate[] {
  return [
    {
      id: "live_trading_disabled",
      label: "Live trading false default",
      status: "block_live_execution",
      blocksLiveExecution: true,
      message: LIVE_EXECUTION_UNAVAILABLE_MESSAGE
    },
    {
      id: "order_review_disabled",
      label: "Broker order review unavailable",
      status: "block_live_execution",
      blocksLiveExecution: true,
      message:
        "Real broker order review is future-gated and unavailable in this build."
    },
    {
      id: "cancel_order_disabled",
      label: "Cancel order unavailable",
      status: "block_live_execution",
      blocksLiveExecution: true,
      message:
        "Real broker cancel order support is future-gated and unavailable in this build."
    },
    {
      id: "per_order_notional_placeholder",
      label: "Per-order notional placeholder",
      status: "block_live_execution",
      blocksLiveExecution: true,
      message:
        "No trusted quote-backed notional calculation exists for live execution."
    },
    {
      id: "ticker_symbol_ambiguity",
      label: "Ticker and symbol ambiguity",
      status:
        plan.parse.kind === "equity_order"
          ? "warning_for_dry_run"
          : "block_live_execution",
      blocksLiveExecution: true,
      message:
        "Symbol resolution is not connected to a live broker symbol authority."
    },
    {
      id: "quote_freshness_placeholder",
      label: "Quote freshness placeholder",
      status: "block_live_execution",
      blocksLiveExecution: true,
      message: "No fresh broker quote is attached to this execution plan."
    },
    {
      id: "buying_power_placeholder",
      label: "Buying power placeholder",
      status: "block_live_execution",
      blocksLiveExecution: true,
      message: "No real buying power check is connected to this execution plan."
    },
    {
      id: "tradability_placeholder",
      label: "Tradability placeholder",
      status: "block_live_execution",
      blocksLiveExecution: true,
      message:
        "No real broker tradability check is connected to this execution plan."
    },
    {
      id: "market_hours_warning_placeholder",
      label: "Market-hours warning placeholder",
      status: "warning_for_dry_run",
      blocksLiveExecution: true,
      message:
        "Market-hours validation is not connected; live execution remains blocked."
    },
    {
      id: "supported_asset_class",
      label: "Supported asset class",
      status:
        plan.parse.assetClass === "equity"
          ? "pass_for_dry_run"
          : "block_live_execution",
      blocksLiveExecution: true,
      message:
        plan.parse.assetClass === "equity"
          ? "Equity plans are supported for dry-run/manual handoff only."
          : "Only equity plans are supported for dry-run/manual handoff."
    },
    {
      id: "unsupported_options_gate",
      label: "Unsupported options gate",
      status:
        plan.parse.assetClass === "option"
          ? "block_live_execution"
          : "pass_for_dry_run",
      blocksLiveExecution: true,
      message:
        plan.parse.assetClass === "option"
          ? "Options execution is unsupported and future-gated."
          : "No options contract was created; options remain future-gated."
    },
    {
      id: "generic_confirmation_rejection",
      label: "Generic confirmation rejection",
      status: "block_live_execution",
      blocksLiveExecution: true,
      message:
        "Generic confirmations such as yes or do it are rejected before any mock or future execution step."
    },
    {
      id: "exact_confirmation_phrase_code",
      label: "Exact confirmation phrase/code",
      status: "block_live_execution",
      blocksLiveExecution: true,
      message:
        "Exact phrase and unique code are required before any mock submission or future live path."
    },
    {
      id: "kill_switch_emergency_disable",
      label: "Kill switch / emergency disable",
      status: "block_live_execution",
      blocksLiveExecution: true,
      message:
        "The execution kill switch is active by default and blocks live execution."
    },
    {
      id: "terms_accepted_placeholder",
      label: "Terms accepted placeholder",
      status: "block_live_execution",
      blocksLiveExecution: true,
      message:
        "No durable live-execution terms acceptance gate exists in this build."
    },
    {
      id: "live_mode_opt_in_placeholder",
      label: "Live mode opt-in placeholder",
      status: "block_live_execution",
      blocksLiveExecution: true,
      message: "No live-mode opt-in exists in this build."
    },
    {
      id: "market_orders_disabled",
      label: "Market orders disabled by default",
      status:
        plan.ticket?.type === "market"
          ? "block_live_execution"
          : "pass_for_dry_run",
      blocksLiveExecution: true,
      message:
        plan.ticket?.type === "market"
          ? "Market orders are disabled for future live execution by default."
          : "Limit-style planning is still dry-run/manual handoff only."
    }
  ];
}

function createManualHandoffPrompt(ticket: EquityOrderTicket): string {
  const shareLabel = ticket.quantity === 1 ? "share" : "shares";
  const action =
    ticket.side === "buy"
      ? `long equity order to buy ${ticket.quantity} ${shareLabel} of ${ticket.symbol}`
      : `equity order to sell ${ticket.quantity} ${shareLabel} of ${ticket.symbol}`;
  const limitClause =
    ticket.type === "limit"
      ? ` as a limit order at ${formatMoney(ticket.limitPrice ?? 0)}`
      : "";

  return [
    "ASK YOUR ROBINHOOD AGENT:",
    `Build or review a ${action}${limitClause}.`,
    "Manual request only. Do not place the order unless I separately confirm inside the Robinhood Agent flow.",
    "Before any order action, show the current quote, estimated cost, buying-power impact, tradability, market-hours warnings, and pre-trade warnings.",
    "StreetSpeak context: execution-ready dry-run/manual handoff only. StreetSpeak did not send this to Robinhood, did not review the order, and did not place an order."
  ].join("\n");
}

function createLiveExecutionFailure(
  plan: ExecutionPlan | undefined
): ExecutionGatewayFailure {
  const blockedPlan =
    plan === undefined
      ? undefined
      : appendAudit(
          {
            ...plan,
            lifecycle: appendLifecycleStates(plan.lifecycle, [
              "blocked_live_execution"
            ])
          },
          "execution.live.blocked",
          {
            planId: plan.id,
            ticketId: plan.ticket?.id,
            liveExecutionAvailable: false,
            brokerOrderReviewed: false,
            brokerOrderPlaced: false,
            brokerOrderCanceled: false,
            message: LIVE_EXECUTION_UNAVAILABLE_MESSAGE
          }
        );

  return {
    ok: false,
    code: "live_execution_unavailable",
    message: LIVE_EXECUTION_UNAVAILABLE_MESSAGE,
    ...(blockedPlan === undefined ? {} : { plan: blockedPlan })
  };
}

function createBlockedPlaceholderPlan(
  request: BuildExecutionPlanRequest
): ExecutionPlan {
  const now = request.now ?? new Date();
  const config = createExecutionConfig({ executionMode: "blocked_live" });
  const plan: ExecutionPlan = {
    id: request.id ?? createMockId("blocked-execution-plan"),
    transcript: request.transcript,
    source: request.source ?? "api",
    createdAt: now.toISOString(),
    config,
    parse: parseExecutionCommand(request.transcript),
    lifecycle: ["draft", "parsed"],
    safetyGates: [],
    liveExecutionBlocked: true,
    brokerOrderReviewed: false,
    brokerOrderPlaced: false,
    brokerOrderCanceled: false,
    statement: NO_LIVE_BROKER_ORDER_PLACED_STATEMENT,
    auditTimeline: []
  };

  return appendAudit(plan, "execution.plan.created", {
    planId: plan.id,
    source: plan.source,
    parseKind: plan.parse.kind,
    liveTradingEnabled: false
  });
}

function appendAudit(
  plan: ExecutionPlan,
  type: Parameters<typeof createAuditEvent>[0],
  payload: Record<string, unknown>,
  actor: AuditEventActor = "system"
): ExecutionPlan {
  return {
    ...plan,
    auditTimeline: [
      ...plan.auditTimeline,
      createAuditEvent(type, payload, {
        actor
      })
    ]
  };
}

function appendLifecycleStates(
  current: readonly ExecutionLifecycleState[],
  nextStates: readonly ExecutionLifecycleState[]
): readonly ExecutionLifecycleState[] {
  const next = [...current];

  for (const state of nextStates) {
    if (!next.includes(state)) {
      next.push(state);
    }
  }

  return next;
}

function hasOptionsLanguage(normalized: string): boolean {
  return /\b(option|options|call|calls|put|puts|contract|contracts|strike|expiry|expiration)\b/u.test(
    normalized
  );
}

function hasNotionalOrder(normalized: string): boolean {
  return (
    /\b(buy|sell)\b.{0,32}\$\s*\d/u.test(normalized) ||
    /\b(buy|sell)\b.{0,32}\b\d+(?:\.\d+)?\s*(?:dollars|usd)\b/u.test(normalized)
  );
}

function parseLimitPrice(normalized: string): number | "invalid" | undefined {
  if (/\bat\s+market\b/u.test(normalized)) {
    return undefined;
  }

  const match = normalized.match(/\bat\s+\$?(?<price>\d+(?:\.\d{1,4})?)\b/u);

  if (!match?.groups) {
    return undefined;
  }

  const rawPrice = match.groups.price;

  if (!rawPrice) {
    return "invalid";
  }

  const limitPrice = Number.parseFloat(rawPrice);

  if (!Number.isFinite(limitPrice) || limitPrice <= 0) {
    return "invalid";
  }

  return limitPrice;
}

function formatMoney(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function createMockId(prefix: string): string {
  const randomUUID = globalThis.crypto?.randomUUID;

  if (typeof randomUUID === "function") {
    return `${prefix}-${randomUUID.call(globalThis.crypto)}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
