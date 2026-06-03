import type { EquityOrderTicket } from "@streetspeak-ai/orders";

const GENERIC_CONFIRMATIONS = new Set([
  "yes",
  "y",
  "do it",
  "confirm",
  "confirmed",
  "ok",
  "okay",
  "place it",
  "send it",
  "execute",
  "looks good"
]);

export interface SafetyReview {
  readonly liveTradingEnabled: false;
  readonly requiresExplicitConfirmation: true;
  readonly ticketId: string;
  readonly requiredConfirmationPhrase: string;
  readonly warnings: readonly string[];
  readonly blocks: readonly string[];
}

export type ConfirmationChallengeStatus =
  | "open"
  | "accepted_for_mock_only"
  | "rejected";

export interface ConfirmationChallenge {
  readonly id: string;
  readonly ticketId: string;
  readonly code: string;
  readonly requiredPhrase: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly status: ConfirmationChallengeStatus;
}

export type ConfirmationRejectionReason =
  | "empty_confirmation"
  | "generic_confirmation"
  | "phrase_mismatch"
  | "challenge_expired";

export type ConfirmationEvaluation =
  | {
      readonly accepted: true;
      readonly status: "accepted_for_mock_only";
      readonly normalizedSpokenText: string;
    }
  | {
      readonly accepted: false;
      readonly status: "rejected";
      readonly reason: ConfirmationRejectionReason;
      readonly normalizedSpokenText: string;
    };

export interface ConfirmationChallengeOptions {
  readonly id?: string;
  readonly code?: string;
  readonly now?: Date;
  readonly expiresAt?: Date;
}

export function reviewOrderTicket(ticket: EquityOrderTicket): SafetyReview {
  const warnings: string[] = [];
  const blocks = ["live trading is not implemented in this scaffold"];

  if (ticket.type === "market") {
    warnings.push("market orders do not guarantee execution price");
  }

  return {
    liveTradingEnabled: false,
    requiresExplicitConfirmation: true,
    ticketId: ticket.id,
    requiredConfirmationPhrase: buildConfirmationPhrase(ticket),
    warnings,
    blocks
  };
}

export function buildConfirmationPhrase(ticket: EquityOrderTicket): string {
  const orderDetails =
    ticket.type === "limit"
      ? `${ticket.side.toUpperCase()} ${ticket.quantity} ${ticket.symbol} LIMIT ${ticket.limitPrice}`
      : `${ticket.side.toUpperCase()} ${ticket.quantity} ${ticket.symbol} MARKET`;

  return `CONFIRM MOCK ${orderDetails}`;
}

export function createConfirmationChallenge(
  ticket: EquityOrderTicket,
  options: ConfirmationChallengeOptions = {}
): ConfirmationChallenge {
  const now = options.now ?? new Date();
  const expiresAt =
    options.expiresAt ?? new Date(now.getTime() + 5 * 60 * 1000);

  const code = options.code ?? generateConfirmationCode();

  return {
    id: options.id ?? createMockId("challenge"),
    ticketId: ticket.id,
    code,
    requiredPhrase: `${buildConfirmationPhrase(ticket)} CODE ${code}`,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: "open"
  };
}

export function evaluateConfirmationChallenge(
  challenge: ConfirmationChallenge,
  spokenText: string,
  now: Date = new Date()
): ConfirmationEvaluation {
  const normalizedSpokenText = normalizeConfirmation(spokenText);

  if (!normalizedSpokenText) {
    return {
      accepted: false,
      status: "rejected",
      reason: "empty_confirmation",
      normalizedSpokenText
    };
  }

  if (GENERIC_CONFIRMATIONS.has(normalizedSpokenText)) {
    return {
      accepted: false,
      status: "rejected",
      reason: "generic_confirmation",
      normalizedSpokenText
    };
  }

  if (now.getTime() > new Date(challenge.expiresAt).getTime()) {
    return {
      accepted: false,
      status: "rejected",
      reason: "challenge_expired",
      normalizedSpokenText
    };
  }

  if (
    normalizedSpokenText !== normalizeConfirmation(challenge.requiredPhrase)
  ) {
    return {
      accepted: false,
      status: "rejected",
      reason: "phrase_mismatch",
      normalizedSpokenText
    };
  }

  return {
    accepted: true,
    status: "accepted_for_mock_only",
    normalizedSpokenText
  };
}

export function isSpecificConfirmation(
  spokenText: string,
  requiredPhrase: string
): boolean {
  const normalized = normalizeConfirmation(spokenText);

  if (GENERIC_CONFIRMATIONS.has(normalized)) {
    return false;
  }

  return normalized === normalizeConfirmation(requiredPhrase);
}

function normalizeConfirmation(value: string): string {
  return value.trim().replace(/\s+/gu, " ").toLowerCase();
}

function generateConfirmationCode(): string {
  return Math.floor(Math.random() * 10_000)
    .toString()
    .padStart(4, "0");
}

function createMockId(prefix: string): string {
  const randomUUID = globalThis.crypto?.randomUUID;

  if (typeof randomUUID === "function") {
    return randomUUID.call(globalThis.crypto);
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
