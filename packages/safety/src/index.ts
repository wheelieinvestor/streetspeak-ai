import type { EquityOrderTicket } from "@streetspeak-ai/orders";

const GENERIC_CONFIRMATIONS = new Set(["yes", "y", "do it", "confirm", "ok"]);

export interface SafetyReview {
  readonly liveTradingEnabled: false;
  readonly requiresExplicitConfirmation: true;
  readonly requiredConfirmationPhrase: string;
  readonly warnings: readonly string[];
  readonly blocks: readonly string[];
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
    requiredConfirmationPhrase: buildConfirmationPhrase(ticket),
    warnings,
    blocks
  };
}

export function buildConfirmationPhrase(ticket: EquityOrderTicket): string {
  return `CONFIRM MOCK ${ticket.side.toUpperCase()} ${ticket.quantity} ${ticket.symbol}`;
}

export function isSpecificConfirmation(
  spokenText: string,
  requiredPhrase: string
): boolean {
  const normalized = spokenText.trim().replace(/\s+/gu, " ").toLowerCase();

  if (GENERIC_CONFIRMATIONS.has(normalized)) {
    return false;
  }

  return normalized === requiredPhrase.toLowerCase();
}
