export type StreetSpeakMode = "mock";

export interface StreetSpeakSession {
  readonly mode: StreetSpeakMode;
  readonly liveTradingEnabled: false;
}

export type CommandIntent =
  | "portfolio_question"
  | "market_question"
  | "order_ticket"
  | "unknown";

export interface RoutedCommand {
  readonly transcript: string;
  readonly intent: CommandIntent;
}

export function createMockSession(): StreetSpeakSession {
  return {
    mode: "mock",
    liveTradingEnabled: false
  };
}

export function routeCommand(transcript: string): RoutedCommand {
  const normalized = transcript.trim().toLowerCase();

  if (!normalized) {
    return { transcript, intent: "unknown" };
  }

  if (/\b(buy|sell|order|ticket)\b/u.test(normalized)) {
    return { transcript, intent: "order_ticket" };
  }

  if (/\b(portfolio|positions|holdings|pnl|p&l)\b/u.test(normalized)) {
    return { transcript, intent: "portfolio_question" };
  }

  if (/\b(market|price|quote|volume|ticker)\b/u.test(normalized)) {
    return { transcript, intent: "market_question" };
  }

  return { transcript, intent: "unknown" };
}
