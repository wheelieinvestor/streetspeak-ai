import {
  createAuditEvent,
  InMemoryAuditSink,
  type AuditEvent,
  type AuditEventActor
} from "@streetspeak-ai/audit";
import {
  createMockBrokerAdapter,
  formatMockPortfolio,
  type BrokerAdapter,
  type MockBrokerSubmission,
  type MockPortfolio,
  type MockQuote,
  type MockQuoteLookupResult,
  type MockTickerSymbol
} from "@streetspeak-ai/brokers";
import {
  createEquityOrderTicket,
  transitionOrderTicket,
  type EquityOrderSide,
  type EquityOrderTicket,
  type EquityOrderTicketInput,
  type EquityOrderType,
  type OrderValidationResult
} from "@streetspeak-ai/orders";
import {
  createConfirmationChallenge,
  evaluateConfirmationChallenge,
  reviewOrderTicket,
  type ConfirmationChallenge,
  type ConfirmationEvaluation,
  type SafetyReview
} from "@streetspeak-ai/safety";

export type StreetSpeakMode = "mock";
export type LiveTradingEnabled = false;

export interface StreetSpeakSession {
  readonly mode: StreetSpeakMode;
  readonly liveTradingEnabled: LiveTradingEnabled;
  readonly userId?: string;
  readonly startedAt: string;
}

export type CommandIntent =
  | "portfolio_question"
  | "market_question"
  | "order_ticket"
  | "unknown";

export type CommandSource = "voice" | "keyboard" | "api" | "mock";

export interface UserCommand {
  readonly id: string;
  readonly transcript: string;
  readonly source: CommandSource;
  readonly receivedAt: string;
  readonly sessionMode: StreetSpeakMode;
}

export interface RoutedCommand {
  readonly transcript: string;
  readonly intent: CommandIntent;
  readonly confidence: number;
  readonly advisoryBoundary: "non_advisory";
  readonly orderTicketRequested: boolean;
}

export interface ParsedIntent {
  readonly command: UserCommand;
  readonly route: RoutedCommand;
}

export type MockPortfolioQuestionKind =
  | "portfolio_summary"
  | "positions"
  | "buying_power";

export interface ParsedMockOrderCommand {
  readonly side: EquityOrderSide;
  readonly quantity: number;
  readonly symbol: MockTickerSymbol;
  readonly type: EquityOrderType;
  readonly limitPrice?: number;
  readonly timeInForce: "day";
}

export type MockTradingCommandParseResult =
  | {
      readonly kind: "order_ticket";
      readonly order: ParsedMockOrderCommand;
      readonly summary: string;
    }
  | {
      readonly kind: "portfolio_question";
      readonly question: MockPortfolioQuestionKind;
      readonly summary: string;
    }
  | {
      readonly kind: "quote_question";
      readonly symbol: MockTickerSymbol;
      readonly summary: string;
    }
  | {
      readonly kind: "unsupported";
      readonly reason:
        | "notional_not_supported"
        | "unsupported_mock_symbol"
        | "unsupported_command";
      readonly message: string;
    }
  | {
      readonly kind: "invalid";
      readonly reason:
        | "empty_command"
        | "ambiguous_order"
        | "missing_order_details"
        | "missing_quote_symbol"
        | "invalid_limit_price";
      readonly message: string;
    };

export type MockTradingDeskStatus =
  | "answered"
  | "awaiting_confirmation"
  | "unsupported"
  | "invalid"
  | "confirmation_rejected"
  | "mock_submitted";

export interface MockTradingDeskState {
  readonly session: StreetSpeakSession;
  readonly command: UserCommand;
  readonly route: RoutedCommand;
  readonly parse: MockTradingCommandParseResult;
  readonly status: MockTradingDeskStatus;
  readonly message: string;
  readonly answer?: string;
  readonly portfolio?: MockPortfolio;
  readonly quote?: MockQuote;
  readonly quoteLookup?: MockQuoteLookupResult;
  readonly ticket?: EquityOrderTicket;
  readonly orderValidation?: OrderValidationResult;
  readonly safetyReview?: SafetyReview;
  readonly challenge?: ConfirmationChallenge;
  readonly confirmation?: ConfirmationEvaluation;
  readonly brokerResponse?: MockBrokerSubmission;
  readonly auditTimeline: readonly AuditEvent[];
}

export interface MockTradingDeskTurnOptions {
  readonly session?: StreetSpeakSession;
  readonly commandId?: string;
  readonly source?: CommandSource;
  readonly now?: Date;
  readonly ticketId?: string;
  readonly challengeId?: string;
  readonly challengeCode?: string;
  readonly challengeExpiresAt?: Date;
  readonly brokerAdapter?: BrokerAdapter;
}

export interface MockTradingDeskConfirmationOptions {
  readonly now?: Date;
  readonly brokerAdapter?: BrokerAdapter;
}

const SUPPORTED_MOCK_SYMBOLS: readonly MockTickerSymbol[] = [
  "HOOD",
  "SPY",
  "NVDA",
  "AAPL",
  "SOFI"
];

const SHARE_ORDER_PATTERN =
  /\b(?<side>buy|sell)\s+(?<quantity>\d+)\s+(?<symbol>[a-z][a-z0-9.]{0,9})\b/giu;

const UNSUPPORTED_NOTIONAL_MESSAGE =
  "StreetSpeak AI v0.1 supports share-quantity equity tickets only. Notional commands require quote lookup, share conversion, and explicit user confirmation before a final ticket can be created. No dollar amount was converted into shares.";

export function createMockSession(
  options: { readonly userId?: string; readonly now?: Date } = {}
): StreetSpeakSession {
  return {
    mode: "mock",
    liveTradingEnabled: false,
    ...(options.userId === undefined ? {} : { userId: options.userId }),
    startedAt: (options.now ?? new Date()).toISOString()
  };
}

export function routeCommand(transcript: string): RoutedCommand {
  const normalized = transcript.trim().toLowerCase();

  if (!normalized) {
    return toRoute(transcript, "unknown", 0.1);
  }

  if (/\b(buy|sell|order|ticket)\b/u.test(normalized)) {
    return toRoute(transcript, "order_ticket", 0.9);
  }

  if (
    /\b(portfolio|positions|holdings|pnl|p&l|buying power|cash)\b/u.test(
      normalized
    )
  ) {
    return toRoute(transcript, "portfolio_question", 0.85);
  }

  if (/\b(market|price|quote|volume|ticker|trading at)\b/u.test(normalized)) {
    return toRoute(transcript, "market_question", 0.8);
  }

  return toRoute(transcript, "unknown", 0.2);
}

export function parseUserCommand(command: UserCommand): ParsedIntent {
  return {
    command,
    route: routeCommand(command.transcript)
  };
}

export function createMockUserCommand(
  transcript: string,
  options: {
    readonly id?: string;
    readonly source?: CommandSource;
    readonly now?: Date;
  } = {}
): UserCommand {
  return {
    id: options.id ?? "mock-command",
    transcript,
    source: options.source ?? "mock",
    receivedAt: (options.now ?? new Date()).toISOString(),
    sessionMode: "mock"
  };
}

export function parseMockTradingCommand(
  transcript: string
): MockTradingCommandParseResult {
  const normalized = transcript.trim().toLowerCase();
  const route = routeCommand(transcript);

  if (!normalized) {
    return {
      kind: "invalid",
      reason: "empty_command",
      message: "Enter a mock portfolio, quote, or share-quantity order command."
    };
  }

  if (hasNotionalOrder(normalized)) {
    return {
      kind: "unsupported",
      reason: "notional_not_supported",
      message: UNSUPPORTED_NOTIONAL_MESSAGE
    };
  }

  if (route.intent === "portfolio_question") {
    return parsePortfolioQuestion(normalized);
  }

  if (route.intent === "market_question") {
    return parseQuoteQuestion(normalized);
  }

  if (route.intent === "order_ticket") {
    return parseShareQuantityOrder(normalized);
  }

  return {
    kind: "unsupported",
    reason: "unsupported_command",
    message:
      "StreetSpeak AI v0.1 supports mock portfolio questions, mock quote questions, and share-quantity equity tickets."
  };
}

export async function createMockTradingDeskTurn(
  transcript: string,
  options: MockTradingDeskTurnOptions = {}
): Promise<MockTradingDeskState> {
  const now = options.now ?? new Date();
  const session =
    options.session ??
    createMockSession({
      now
    });
  const brokerAdapter = options.brokerAdapter ?? createMockBrokerAdapter();
  const command = createMockUserCommand(transcript, {
    id: options.commandId,
    source: options.source ?? "keyboard",
    now
  });
  const route = routeCommand(transcript);
  const parse = parseMockTradingCommand(transcript);
  const auditSink = new InMemoryAuditSink();

  await appendAudit(auditSink, "command.received", {
    commandId: command.id,
    source: command.source,
    sessionMode: command.sessionMode,
    transcript: command.transcript,
    rawAudioStored: false
  });
  await appendAudit(auditSink, "command.routed", {
    commandId: command.id,
    intent: route.intent,
    confidence: route.confidence,
    advisoryBoundary: route.advisoryBoundary,
    orderTicketRequested: route.orderTicketRequested
  });

  if (parse.kind === "portfolio_question") {
    const portfolio = brokerAdapter.getMockPortfolio();
    const answer = createPortfolioAnswer(portfolio, parse.question);

    return {
      session,
      command,
      route,
      parse,
      status: "answered",
      message: "Answered from the local mock portfolio.",
      answer,
      portfolio,
      auditTimeline: auditSink.getEvents()
    };
  }

  if (parse.kind === "quote_question") {
    const quoteLookup = brokerAdapter.getMockQuote(parse.symbol);
    const answer = quoteLookup.ok
      ? `${quoteLookup.quote.symbol} mock static quote: $${quoteLookup.quote.last.toFixed(
          2
        )} last, $${quoteLookup.quote.bid.toFixed(
          2
        )} bid, $${quoteLookup.quote.ask.toFixed(2)} ask. ${
          quoteLookup.quote.label
        }.`
      : quoteLookup.message;

    return {
      session,
      command,
      route,
      parse,
      status: quoteLookup.ok ? "answered" : "unsupported",
      message: quoteLookup.ok
        ? "Answered from static mock quote data."
        : quoteLookup.message,
      answer,
      quoteLookup,
      ...(quoteLookup.ok ? { quote: quoteLookup.quote } : {}),
      auditTimeline: auditSink.getEvents()
    };
  }

  if (parse.kind === "unsupported") {
    return {
      session,
      command,
      route,
      parse,
      status: "unsupported",
      message: parse.message,
      auditTimeline: auditSink.getEvents()
    };
  }

  if (parse.kind === "invalid") {
    return {
      session,
      command,
      route,
      parse,
      status: "invalid",
      message: parse.message,
      auditTimeline: auditSink.getEvents()
    };
  }

  const ticketResult = createEquityOrderTicket(
    toOrderTicketInput(parse.order),
    {
      id: options.ticketId,
      now
    }
  );

  if (!ticketResult.ok) {
    return {
      session,
      command,
      route,
      parse,
      status: "invalid",
      message: ticketResult.validation.errors.join("; "),
      orderValidation: ticketResult.validation,
      auditTimeline: auditSink.getEvents()
    };
  }

  await appendAudit(auditSink, "order.ticket.created", {
    commandId: command.id,
    ticketId: ticketResult.ticket.id,
    symbol: ticketResult.ticket.symbol,
    side: ticketResult.ticket.side,
    quantity: ticketResult.ticket.quantity,
    type: ticketResult.ticket.type,
    limitPrice: ticketResult.ticket.limitPrice,
    mode: ticketResult.ticket.mode
  });

  const safetyReview = reviewOrderTicket(ticketResult.ticket);
  await appendAudit(auditSink, "safety.reviewed", {
    ticketId: ticketResult.ticket.id,
    liveTradingEnabled: safetyReview.liveTradingEnabled,
    requiresExplicitConfirmation: safetyReview.requiresExplicitConfirmation,
    warnings: safetyReview.warnings,
    blocks: safetyReview.blocks
  });

  const ticket = transitionOrderTicket(
    ticketResult.ticket,
    "confirmation_required"
  );
  const challenge = createConfirmationChallenge(ticket, {
    id: options.challengeId,
    code: options.challengeCode,
    now,
    expiresAt: options.challengeExpiresAt
  });

  await appendAudit(auditSink, "confirmation.challenge.created", {
    ticketId: ticket.id,
    challengeId: challenge.id,
    requiredPhrase: challenge.requiredPhrase,
    expiresAt: challenge.expiresAt
  });

  return {
    session,
    command,
    route,
    parse,
    status: "awaiting_confirmation",
    message:
      "Review the safety result, then type the exact mock confirmation phrase and code.",
    ticket,
    safetyReview,
    challenge,
    auditTimeline: auditSink.getEvents()
  };
}

export async function submitMockTradingDeskConfirmation(
  state: MockTradingDeskState,
  confirmationText: string,
  options: MockTradingDeskConfirmationOptions = {}
): Promise<MockTradingDeskState> {
  if (!state.ticket || !state.challenge) {
    return {
      ...state,
      status: "invalid",
      message: "No open mock confirmation challenge is available."
    };
  }

  const now = options.now ?? new Date();
  const brokerAdapter = options.brokerAdapter ?? createMockBrokerAdapter();
  const confirmation = evaluateConfirmationChallenge(
    state.challenge,
    confirmationText,
    now
  );
  const auditSink = new InMemoryAuditSink();

  for (const event of state.auditTimeline) {
    await auditSink.append(event);
  }

  if (!confirmation.accepted) {
    await appendAudit(auditSink, "confirmation.rejected", {
      ticketId: state.ticket.id,
      challengeId: state.challenge.id,
      reason: confirmation.reason,
      normalizedSpokenText: confirmation.normalizedSpokenText,
      rawAudioStored: false
    });

    return {
      ...state,
      status: "confirmation_rejected",
      message:
        confirmation.reason === "generic_confirmation"
          ? "Confirmation rejected. Generic confirmations never submit an order; use the exact challenge phrase and code for mock-only submission."
          : "Confirmation rejected. Mock submission requires the exact challenge phrase and code.",
      challenge: {
        ...state.challenge,
        status: confirmation.status
      },
      confirmation,
      auditTimeline: auditSink.getEvents()
    };
  }

  await appendAudit(auditSink, "confirmation.accepted", {
    ticketId: state.ticket.id,
    challengeId: state.challenge.id,
    normalizedSpokenText: confirmation.normalizedSpokenText,
    rawAudioStored: false
  });

  const readyTicket = transitionOrderTicket(
    state.ticket,
    "mock_submission_ready"
  );
  await appendAudit(auditSink, "mock.execution.requested", {
    ticketId: readyTicket.id,
    symbol: readyTicket.symbol,
    side: readyTicket.side,
    quantity: readyTicket.quantity,
    type: readyTicket.type,
    liveTradingEnabled: false
  });

  const brokerResponse = await brokerAdapter.submitMockOrder(readyTicket);
  await appendAudit(
    auditSink,
    "mock.execution.submitted",
    {
      ticketId: readyTicket.id,
      mockOrderId: brokerResponse.id,
      status: brokerResponse.status,
      liveExecutionAvailable: brokerResponse.liveExecutionAvailable,
      message: brokerResponse.message
    },
    "mock_broker"
  );

  return {
    ...state,
    status: "mock_submitted",
    message: brokerResponse.message,
    ticket: transitionOrderTicket(readyTicket, "mock_submitted"),
    challenge: {
      ...state.challenge,
      status: confirmation.status
    },
    confirmation,
    brokerResponse,
    auditTimeline: auditSink.getEvents()
  };
}

function toRoute(
  transcript: string,
  intent: CommandIntent,
  confidence: number
): RoutedCommand {
  return {
    transcript,
    intent,
    confidence,
    advisoryBoundary: "non_advisory",
    orderTicketRequested: intent === "order_ticket"
  };
}

function hasNotionalOrder(normalized: string): boolean {
  return (
    /\b(buy|sell)\b.{0,32}\$\s*\d/u.test(normalized) ||
    /\b(buy|sell)\b.{0,32}\b\d+(?:\.\d+)?\s*(?:dollars|usd)\b/u.test(normalized)
  );
}

function parsePortfolioQuestion(
  normalized: string
): MockTradingCommandParseResult {
  if (/\b(buying power|cash)\b/u.test(normalized)) {
    return {
      kind: "portfolio_question",
      question: "buying_power",
      summary: "Mock buying power question"
    };
  }

  if (/\b(positions|holdings)\b/u.test(normalized)) {
    return {
      kind: "portfolio_question",
      question: "positions",
      summary: "Mock positions question"
    };
  }

  return {
    kind: "portfolio_question",
    question: "portfolio_summary",
    summary: "Mock portfolio question"
  };
}

function parseQuoteQuestion(normalized: string): MockTradingCommandParseResult {
  const symbol = findSupportedMockSymbol(normalized);

  if (symbol) {
    return {
      kind: "quote_question",
      symbol,
      summary: `Mock quote question for ${symbol}`
    };
  }

  if (/\b[A-Za-z]{1,5}\b/u.test(normalized)) {
    return {
      kind: "unsupported",
      reason: "unsupported_mock_symbol",
      message:
        "StreetSpeak AI v0.1 only includes mock static quotes for HOOD, SPY, NVDA, AAPL, and SOFI."
    };
  }

  return {
    kind: "invalid",
    reason: "missing_quote_symbol",
    message:
      "Ask for a mock quote by symbol, such as 'show me a quote for NVDA'."
  };
}

function parseShareQuantityOrder(
  normalized: string
): MockTradingCommandParseResult {
  const matches = [...normalized.matchAll(SHARE_ORDER_PATTERN)];
  SHARE_ORDER_PATTERN.lastIndex = 0;

  if (matches.length > 1) {
    return {
      kind: "invalid",
      reason: "ambiguous_order",
      message: "StreetSpeak AI v0.1 can build one mock order ticket at a time."
    };
  }

  const match = matches[0];

  if (!match?.groups) {
    return {
      kind: "invalid",
      reason: "missing_order_details",
      message:
        "Use a share-quantity equity command such as 'buy 5 HOOD' or 'build a limit order to buy 3 AAPL at 175'."
    };
  }

  const rawSide = match.groups.side;
  const rawQuantity = match.groups.quantity;
  const rawSymbol = match.groups.symbol;

  if (!rawSide || !rawQuantity || !rawSymbol) {
    return {
      kind: "invalid",
      reason: "missing_order_details",
      message:
        "Use a share-quantity equity command such as 'buy 5 HOOD' or 'build a limit order to buy 3 AAPL at 175'."
    };
  }

  const symbol = rawSymbol.toUpperCase();

  if (!isSupportedMockSymbol(symbol)) {
    return {
      kind: "unsupported",
      reason: "unsupported_mock_symbol",
      message:
        "StreetSpeak AI v0.1 can build mock tickets only for HOOD, SPY, NVDA, AAPL, and SOFI."
    };
  }

  const side = rawSide as EquityOrderSide;
  const quantity = Number.parseInt(rawQuantity, 10);
  const limitPrice = parseLimitPrice(normalized);

  if (limitPrice === "invalid") {
    return {
      kind: "invalid",
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
      kind: "invalid",
      reason: "invalid_limit_price",
      message: "Limit orders require a positive numeric limit price."
    };
  }

  return {
    kind: "order_ticket",
    order: {
      side,
      quantity,
      symbol,
      type,
      ...(limitPrice === undefined ? {} : { limitPrice }),
      timeInForce: "day"
    },
    summary:
      type === "limit"
        ? `${side.toUpperCase()} ${quantity} ${symbol} LIMIT ${limitPrice}`
        : `${side.toUpperCase()} ${quantity} ${symbol} MARKET`
  };
}

function parseLimitPrice(normalized: string): number | "invalid" | undefined {
  if (/\bat\s+market\b/u.test(normalized)) {
    return undefined;
  }

  const match = normalized.match(/\bat\s+(?<price>\d+(?:\.\d{1,4})?)\b/u);

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

function findSupportedMockSymbol(normalized: string): MockTickerSymbol | null {
  for (const symbol of SUPPORTED_MOCK_SYMBOLS) {
    if (new RegExp(`\\b${symbol.toLowerCase()}\\b`, "u").test(normalized)) {
      return symbol;
    }
  }

  return null;
}

function isSupportedMockSymbol(symbol: string): symbol is MockTickerSymbol {
  return SUPPORTED_MOCK_SYMBOLS.includes(symbol as MockTickerSymbol);
}

function toOrderTicketInput(
  order: ParsedMockOrderCommand
): EquityOrderTicketInput {
  return {
    symbol: order.symbol,
    side: order.side,
    quantity: order.quantity,
    type: order.type,
    ...(order.limitPrice === undefined ? {} : { limitPrice: order.limitPrice }),
    timeInForce: order.timeInForce
  };
}

function createPortfolioAnswer(
  portfolio: MockPortfolio,
  question: MockPortfolioQuestionKind
): string {
  if (question === "buying_power") {
    return `$${portfolio.buyingPower.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} mock buying power. ${portfolio.label}.`;
  }

  if (question === "positions") {
    return `Mock positions: ${portfolio.positions
      .map((position) => `${position.quantity} ${position.symbol}`)
      .join(", ")}. ${portfolio.label}.`;
  }

  return `${formatMockPortfolio(portfolio)} ${portfolio.label}.`;
}

async function appendAudit(
  auditSink: InMemoryAuditSink,
  type: Parameters<typeof createAuditEvent>[0],
  payload: Record<string, unknown>,
  actor: AuditEventActor = "system"
): Promise<void> {
  await auditSink.append(
    createAuditEvent(type, payload, {
      actor
    })
  );
}
