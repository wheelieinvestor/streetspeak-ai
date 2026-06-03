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

  if (/\b(portfolio|positions|holdings|pnl|p&l)\b/u.test(normalized)) {
    return toRoute(transcript, "portfolio_question", 0.85);
  }

  if (/\b(market|price|quote|volume|ticker)\b/u.test(normalized)) {
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
