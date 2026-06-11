import type { MockTradingDeskState } from "@streetspeak-ai/core";

export type ConversationEntryKind =
  | "user"
  | "assistant"
  | "intent"
  | "ticket"
  | "safety"
  | "confirmation"
  | "receipt"
  | "clarification";

export interface ConversationEntry {
  readonly id: string;
  readonly kind: ConversationEntryKind;
  readonly title: string;
  readonly body: string;
  readonly tone: "neutral" | "warning" | "success";
}

export interface ClarificationOption {
  readonly id: string;
  readonly label: string;
  readonly command: string;
  readonly safetyNote: string;
}

export interface ClarificationPrompt {
  readonly message: string;
  readonly requiresExplicitChoice: true;
  readonly options: readonly ClarificationOption[];
}

const REPAIR_SYMBOLS = ["HOOD", "SPY", "NVDA", "AAPL", "SOFI"] as const;

export function buildConversationTimeline(
  state: MockTradingDeskState | null
): readonly ConversationEntry[] {
  if (!state) {
    return [
      {
        id: "assistant-ready",
        kind: "assistant",
        title: "StreetSpeak AI",
        body: "Accept onboarding, then type or say a mock portfolio, quote, or share-quantity order command.",
        tone: "neutral"
      }
    ];
  }

  const entries: ConversationEntry[] = [
    {
      id: `${state.command.id}-user`,
      kind: "user",
      title: `User ${state.command.source}`,
      body: state.command.transcript,
      tone: "neutral"
    },
    {
      id: `${state.command.id}-intent`,
      kind: "intent",
      title: "Parsed intent",
      body: `${state.route.intent.replaceAll("_", " ")} / confidence ${state.route.confidence.toFixed(2)} / ${describeParse(state)}`,
      tone: "neutral"
    },
    {
      id: `${state.command.id}-assistant`,
      kind: "assistant",
      title: "StreetSpeak AI",
      body: state.answer ?? state.message,
      tone:
        state.status === "invalid" ||
        state.status === "unsupported" ||
        state.status === "confirmation_rejected"
          ? "warning"
          : "neutral"
    }
  ];

  if (state.ticket) {
    entries.push({
      id: `${state.ticket.id}-ticket`,
      kind: "ticket",
      title: "Mock ticket",
      body: `${state.ticket.side.toUpperCase()} ${state.ticket.quantity} ${state.ticket.symbol} / ${state.ticket.type} / ${state.ticket.lifecycleState}`,
      tone: "neutral"
    });
  }

  if (state.safetyReview) {
    entries.push({
      id: `${state.safetyReview.ticketId}-safety`,
      kind: "safety",
      title: "Safety review",
      body: state.safetyReview.blocks.length
        ? `Blocked: ${state.safetyReview.blocks.join("; ")}`
        : `Exact confirmation required. Live trading enabled: ${String(state.safetyReview.liveTradingEnabled)}.`,
      tone: state.safetyReview.blocks.length ? "warning" : "neutral"
    });
  }

  if (state.challenge) {
    entries.push({
      id: `${state.challenge.id}-confirmation`,
      kind: "confirmation",
      title: "Confirmation challenge",
      body: `Exact phrase and code required. Challenge status: ${state.challenge.status}. Generic confirmations never submit.`,
      tone: state.challenge.status === "rejected" ? "warning" : "neutral"
    });
  }

  if (state.confirmation && !state.confirmation.accepted) {
    entries.push({
      id: `${state.command.id}-confirmation-rejected`,
      kind: "confirmation",
      title: "Confirmation rejected",
      body: "The confirmation did not match the exact mock phrase and code. Generic confirmations remain blocked.",
      tone: "warning"
    });
  }

  if (state.status === "mock_submitted") {
    entries.push({
      id: `${state.command.id}-receipt`,
      kind: "receipt",
      title: "Mock receipt ready",
      body: "A local mock receipt can be exported. No live broker order was placed.",
      tone: "success"
    });
  }

  const clarification = createClarificationPrompt(state);

  if (clarification) {
    entries.push({
      id: `${state.command.id}-clarification`,
      kind: "clarification",
      title: "Clarification needed",
      body: clarification.message,
      tone: "warning"
    });
  }

  return entries;
}

export function createClarificationPrompt(
  state: MockTradingDeskState | null
): ClarificationPrompt | null {
  if (!state) {
    return null;
  }

  if (state.status !== "invalid" && state.status !== "unsupported") {
    return null;
  }

  const symbol = findRepairSymbol(state.command.transcript);
  const side = findOrderSide(state.command.transcript);
  const options: ClarificationOption[] = [];

  if (symbol && side) {
    options.push({
      id: "one-share-ticket",
      label: `Build 1-share mock ${side} ticket for ${symbol}`,
      command: `${side} 1 ${symbol}`,
      safetyNote:
        "Creates a new mock ticket only after this explicit button press."
    });
  }

  if (symbol) {
    options.push({
      id: "quote-first",
      label: `Check mock quote for ${symbol}`,
      command: `what is ${symbol} trading at`,
      safetyNote: "Runs a read-only fixture quote command."
    });
  }

  if (state.parse.kind === "unsupported") {
    if (state.parse.reason === "notional_not_supported") {
      return {
        message:
          "Dollar-based orders need repair before StreetSpeak can create a mock ticket. Choose a share-quantity ticket or check the mock quote first.",
        requiresExplicitChoice: true,
        options
      };
    }

    return {
      message:
        "StreetSpeak did not understand that command. Try a mock portfolio question, mock quote question, or share-quantity order.",
      requiresExplicitChoice: true,
      options
    };
  }

  if (
    state.parse.kind === "invalid" &&
    state.parse.reason === "ambiguous_order"
  ) {
    return {
      message:
        "That order is ambiguous. Choose an explicit share-quantity repair or type a clearer command.",
      requiresExplicitChoice: true,
      options
    };
  }

  if (
    state.parse.kind === "invalid" &&
    state.parse.reason === "missing_order_details"
  ) {
    return {
      message:
        "StreetSpeak needs side, whole-share quantity, and symbol before creating a mock ticket.",
      requiresExplicitChoice: true,
      options
    };
  }

  return {
    message: "StreetSpeak needs a clearer mock command before it can continue.",
    requiresExplicitChoice: true,
    options
  };
}

function describeParse(state: MockTradingDeskState): string {
  if ("summary" in state.parse) {
    return state.parse.summary;
  }

  return state.parse.message;
}

function findRepairSymbol(transcript: string): string | null {
  const normalized = transcript.toUpperCase();

  return REPAIR_SYMBOLS.find((symbol) => normalized.includes(symbol)) ?? null;
}

function findOrderSide(transcript: string): "buy" | "sell" | null {
  const normalized = transcript.toLowerCase();

  if (/\bbuy\b/u.test(normalized)) {
    return "buy";
  }

  if (/\bsell\b/u.test(normalized)) {
    return "sell";
  }

  return null;
}
