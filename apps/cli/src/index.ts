#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { pathToFileURL } from "node:url";
import {
  createMockSession,
  createMockTradingDeskTurn,
  parseMockTradingCommand,
  submitMockTradingDeskConfirmation,
  type CommandSource,
  type MockTradingDeskState
} from "@streetspeak-ai/core";
import {
  runRobinhoodMcpReadOnlySmokeTest,
  type RobinhoodMcpReadOnlyClient
} from "@streetspeak-ai/brokers";
import {
  BlockedLiveExecutionGateway,
  DryRunExecutionGateway,
  LIVE_EXECUTION_UNAVAILABLE_MESSAGE,
  ManualHandoffExecutionGateway,
  createExecutionReadinessStatus,
  type ExecutionDryRunResult,
  type ExecutionGateway,
  type ExecutionGatewayResult,
  type ExecutionManualHandoff,
  type ExecutionPlan
} from "@streetspeak-ai/execution";

export interface CliRunResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}

export interface StreetSpeakCliRuntime {
  readonly platform?: NodeJS.Platform | string;
  readonly now?: Date;
  readonly challengeCode?: string;
  readonly textToSpeechProvider?: TextToSpeechProvider;
  readonly runCommand?: CommandRunner;
  readonly robinhoodMcpClient?: RobinhoodMcpReadOnlyClient;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly fetch?: typeof fetch;
  readonly importModule?: (modulePath: string) => Promise<unknown>;
  readonly interactiveInput?: InteractiveInput;
  readonly writeOutput?: (text: string) => void | Promise<void>;
  readonly color?: boolean;
}

export type InteractiveInput = AsyncIterable<string> | Iterable<string>;

export type TextToSpeechProviderKind =
  | "elevenlabs"
  | "macos_say"
  | "stdout_fallback";

export type CommandRunner = (
  command: string,
  args: readonly string[]
) => Promise<void>;

export interface TextToSpeechResult {
  readonly provider: TextToSpeechProviderKind;
  readonly requestedProvider?: TextToSpeechProviderKind;
  readonly fallbackFrom?: TextToSpeechProviderKind;
  readonly fallbackReason?: string;
  readonly text: string;
  readonly rawAudioStoredByStreetSpeak: false;
  readonly command?: "afplay" | "say";
  readonly args?: readonly string[];
  readonly voice?: string;
  readonly modelId?: string;
}

export interface TextToSpeechProvider {
  readonly kind: TextToSpeechProviderKind;
  speak(text: string): Promise<TextToSpeechResult>;
}

export interface TextToSpeechProviderOptions {
  readonly platform?: NodeJS.Platform | string;
  readonly provider?: TextToSpeechProviderKind;
  readonly macosVoice?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly fetch?: typeof fetch;
  readonly runCommand?: CommandRunner;
}

export interface RobinhoodHandoffResult {
  readonly supported: boolean;
  readonly prompt?: string;
  readonly message: string;
}

interface InteractiveSessionState {
  readonly session: ReturnType<typeof createMockSession>;
  readonly startedAt: Date;
  readonly lines: string[];
  readonly useColor: boolean;
  readonly input: InteractiveInput;
  readonly commandSource: CommandSource;
  readonly writeOutput?: (text: string) => void | Promise<void>;
  readonly ttsProvider?: TextToSpeechProviderKind;
  readonly macosVoice?: string;
  latestTranscript?: string;
  latestState?: MockTradingDeskState;
  latestTicketState?: MockTradingDeskState;
  latestReceipt?: SessionReceipt;
  speakEnabled: boolean;
  suppressSpeakForCurrentResponse?: boolean;
  turnCount: number;
}

interface SessionReceipt {
  readonly generatedAt: string;
  readonly commandTranscript: string;
  readonly ticketSummary: string;
  readonly mockOrderId: string;
  readonly brokerStatus: string;
  readonly statement: "No live broker order was placed.";
  readonly liveTradingEnabled: false;
  readonly rawAudioStored: false;
  readonly auditEventCount: number;
}

const STATUS_LINES = [
  "StreetSpeak AI CLI status",
  "mock trading desk: available",
  "Robinhood fixture explorer: available in the web app",
  "Robinhood MCP read-only boundary: unavailable/unconfigured by default",
  "live trading: unavailable",
  "order review: unavailable",
  "order placement: unavailable",
  "cancel order: unavailable",
  "execution dry-run: available",
  "execution manual handoff: available",
  "execution kill switch: active",
  "execution exact confirmation required: true",
  "broker execution future-gated: true",
  "credentials stored by StreetSpeak: false",
  "raw MCP output printed: false",
  "investment advice/trade recommendations: unavailable"
] as const;

const HELP_LINES = [
  "StreetSpeak CLI",
  "",
  "Commands:",
  "  streetspeak",
  "  streetspeak session [--speak] [--tts elevenlabs]",
  "  streetspeak session --transcript-file ./transcript.txt",
  "  streetspeak status",
  '  streetspeak transcript "buy 5 HOOD" [--speak]',
  '  streetspeak demo "show my portfolio"',
  '  streetspeak demo "what is HOOD trading at"',
  '  streetspeak demo "buy 5 HOOD" [--speak]',
  '  streetspeak execute plan "buy 5 HOOD"',
  '  streetspeak execute dry-run "buy 5 HOOD"',
  '  streetspeak execute handoff "buy 5 HOOD"',
  "  streetspeak execute status",
  "  streetspeak robinhood smoke",
  '  streetspeak robinhood handoff "buy 5 HOOD"',
  '  streetspeak speak "text" [--voice Samantha] [--provider elevenlabs]',
  "",
  "Voice bridge input is text transcripts only; StreetSpeak stores no raw audio.",
  "No live trading, order review, order placement, or cancel-order command exists in this CLI."
] as const;

const SESSION_HELP_LINES = [
  "Session commands:",
  "  help",
  "  status",
  "  show my portfolio",
  "  what is HOOD trading at",
  "  buy 5 HOOD",
  "  buy $500 of HOOD",
  "  confirm <exact phrase>",
  "  yes",
  "  receipt",
  "  handoff",
  "  smoke",
  "  speak on",
  "  speak off",
  "  clear",
  "  exit",
  "",
  "Next steps after a mock ticket:",
  "  1. Generic confirmations like yes are rejected.",
  "  2. Use confirm <exact phrase/code> for mock submission only.",
  "  3. Type receipt for the mock receipt or handoff for a manual Robinhood Agent prompt."
] as const;

const SAFE_DEMO_FOOTER = [
  "This is not investment advice.",
  "Review everything before acting outside StreetSpeak.",
  "Actual Robinhood trade approval happens outside StreetSpeak for now."
] as const;

export async function runStreetSpeakCli(
  argv: readonly string[],
  runtime: StreetSpeakCliRuntime = {}
): Promise<CliRunResult> {
  const parsed = parseCliArgs(argv);

  if (parsed.error) {
    return error(parsed.error);
  }

  const [command, ...rest] = parsed.positionals;

  if (!command || command === "session") {
    return runInteractiveSession(runtime, {
      initialSpeakEnabled: parsed.speak,
      transcriptFilePath: parsed.transcriptFilePath,
      ttsProvider: parsed.ttsProvider,
      macosVoice: parsed.macosVoice
    });
  }

  if (command === "help" || command === "--help" || command === "-h") {
    return ok([...HELP_LINES]);
  }

  if (command === "status") {
    return ok([...STATUS_LINES]);
  }

  if (parsed.transcriptFilePath !== undefined) {
    return error(
      "Use --transcript-file with the session command only. No transcript was submitted."
    );
  }

  if (command === "transcript") {
    const transcript = rest.join(" ").trim();

    if (!transcript) {
      return error(
        'Provide text transcript input, such as: streetspeak transcript "buy 5 HOOD"'
      );
    }

    const state = await createMockTradingDeskTurn(transcript, {
      commandId: "cli-transcript-command",
      ticketId: "cli-transcript-ticket",
      challengeId: "cli-transcript-challenge",
      source: "voice",
      ...(runtime.now === undefined ? {} : { now: runtime.now }),
      ...(runtime.challengeCode === undefined
        ? {}
        : { challengeCode: runtime.challengeCode })
    });
    const lines = renderTranscriptBridgeState(state, false);

    if (parsed.speak) {
      lines.push(
        await speakStatusLine(buildSafeSpeakBackText(lines), runtime, {
          ttsProvider: parsed.ttsProvider,
          macosVoice: parsed.macosVoice
        })
      );
    }

    return ok(lines);
  }

  if (command === "demo") {
    const transcript = rest.join(" ").trim();

    if (!transcript) {
      return error(
        'Provide a demo command, such as: streetspeak demo "buy 5 HOOD"'
      );
    }

    const state = await createMockTradingDeskTurn(transcript, {
      commandId: "cli-demo-command",
      ticketId: "cli-mock-ticket",
      challengeId: "cli-mock-challenge",
      source: "keyboard",
      ...(runtime.now === undefined ? {} : { now: runtime.now }),
      ...(runtime.challengeCode === undefined
        ? {}
        : { challengeCode: runtime.challengeCode })
    });
    const lines = renderDemoState(state);

    if (parsed.speak) {
      lines.push(
        await speakStatusLine(buildSafeSpeakBackText(lines), runtime, {
          ttsProvider: parsed.ttsProvider,
          macosVoice: parsed.macosVoice
        })
      );
    }

    return ok(lines);
  }

  if (command === "robinhood") {
    return runRobinhoodCommand(rest, runtime);
  }

  if (command === "execute") {
    return runExecuteCommand(rest, runtime);
  }

  if (command === "speak") {
    const text = rest.join(" ").trim();

    if (!text) {
      return error(
        'Provide text to speak, such as: streetspeak speak "mock ticket only"'
      );
    }

    const provider = getTextToSpeechProvider(runtime, {
      ttsProvider: parsed.ttsProvider,
      macosVoice: parsed.macosVoice
    });
    const result = await provider.speak(text);
    const lines =
      result.provider === "stdout_fallback"
        ? [result.text, renderTtsProviderLine(result)]
        : [renderTtsProviderLine(result)];

    return ok(lines);
  }

  return error(`Unknown command: ${command}\n\n${HELP_LINES.join("\n")}`);
}

interface InteractiveSessionOptions {
  readonly initialSpeakEnabled?: boolean;
  readonly transcriptFilePath?: string;
  readonly ttsProvider?: TextToSpeechProviderKind;
  readonly macosVoice?: string;
}

async function runInteractiveSession(
  runtime: StreetSpeakCliRuntime,
  options: InteractiveSessionOptions = {}
): Promise<CliRunResult> {
  const startedAt = runtime.now ?? new Date();
  let input = runtime.interactiveInput ?? [];
  let transcriptFileNotice: readonly string[] | undefined;

  if (options.transcriptFilePath !== undefined) {
    const transcriptFile = await readTranscriptFile(options.transcriptFilePath);

    if (!transcriptFile.ok) {
      return error(transcriptFile.message);
    }

    input = transcriptFile.lines;
    transcriptFileNotice = renderCard(
      "Transcript File Bridge",
      [
        `Loaded ${transcriptFile.lines.length} text transcript line${
          transcriptFile.lines.length === 1 ? "" : "s"
        }.`,
        "Input source: text transcript file provided by the user.",
        "StreetSpeak stores no transcript file copy and no raw audio.",
        "Every line routes through the same mock-only session command handler.",
        "No live broker order was placed."
      ],
      runtime.color ?? false
    );
  }

  const state: InteractiveSessionState = {
    session: createMockSession({ now: startedAt }),
    startedAt,
    lines: [],
    useColor: runtime.color ?? false,
    input,
    commandSource:
      options.transcriptFilePath === undefined ? "keyboard" : "voice",
    writeOutput: runtime.writeOutput,
    ttsProvider: options.ttsProvider,
    macosVoice: options.macosVoice,
    speakEnabled: options.initialSpeakEnabled ?? false,
    turnCount: 0
  };

  await emit(state, `${renderStartupScreen(state.useColor)}\n`);
  if (state.speakEnabled) {
    await emit(
      state,
      `${renderCard(
        "Speak Back",
        [
          "Speak-back is on for this session.",
          `Provider preference: ${describeTextToSpeechPreference(runtime, options)}.`,
          ...renderTextToSpeechSetupNotice(runtime, options),
          "Responses speak short safe summaries by default.",
          "No raw audio is stored."
        ],
        state.useColor
      ).join("\n")}\n`
    );
  }
  if (transcriptFileNotice) {
    await emit(state, `${transcriptFileNotice.join("\n")}\n`);
  }

  const iterator = toAsyncIterator(state.input);

  while (true) {
    await emit(state, style("streetspeak › ", "cyan", state.useColor));
    const next = await iterator.next();

    if (next.done) {
      await emit(
        state,
        "\nStreetSpeak session closed. No live broker order was placed.\n"
      );
      break;
    }

    const transcript = String(next.value).trim();

    if (!transcript) {
      await emit(
        state,
        "\nEmpty command ignored. Type help for session commands or paste a dictation transcript as text.\n"
      );
      continue;
    }

    const lower = transcript.toLowerCase();

    if (lower === "exit" || lower === "quit") {
      await emit(
        state,
        "\nStreetSpeak session closed. No live broker order was placed.\n"
      );
      break;
    }

    if (lower === "clear") {
      await emit(state, "\u001Bc");
      await emit(state, `${renderStartupScreen(state.useColor)}\n`);
      continue;
    }

    const response = await runInteractiveCommand(
      transcript,
      lower,
      state,
      runtime
    );
    await emitSessionResponse(state, response, runtime);
  }

  return {
    exitCode: 0,
    stdout: state.lines.join(""),
    stderr: ""
  };
}

async function runInteractiveCommand(
  transcript: string,
  lower: string,
  state: InteractiveSessionState,
  runtime: StreetSpeakCliRuntime
): Promise<readonly string[]> {
  if (lower === "help") {
    return renderCard("Help", SESSION_HELP_LINES, state.useColor);
  }

  if (lower === "status") {
    return renderStatusCard(state.useColor);
  }

  if (lower === "speak on") {
    state.speakEnabled = true;
    state.suppressSpeakForCurrentResponse = true;
    return renderCard(
      "Speak Back",
      [
        "Speak-back is on for future responses.",
        `Provider preference: ${describeTextToSpeechPreference(runtime, state)}.`,
        ...renderTextToSpeechSetupNotice(runtime, state),
        "Responses speak short safe summaries by default.",
        "Use speak off to disable it for this session.",
        "No raw audio is stored."
      ],
      state.useColor
    );
  }

  if (lower === "speak off") {
    state.speakEnabled = false;
    state.suppressSpeakForCurrentResponse = true;
    return renderCard(
      "Speak Back",
      [
        "Speak-back is off.",
        "Preferences are per-session only; no config file was written.",
        "No raw audio is stored."
      ],
      state.useColor
    );
  }

  if (lower === "receipt") {
    return state.latestReceipt
      ? renderReceiptCard(state.latestReceipt, state.useColor)
      : renderCard(
          "Receipt",
          [
            "No mock receipt is available yet.",
            "Complete an exact mock confirmation before requesting a receipt.",
            "No live broker order was placed."
          ],
          state.useColor
        );
  }

  if (lower === "handoff") {
    const transcriptForHandoff =
      state.latestTicketState?.ticket &&
      state.latestTicketState.command.transcript
        ? state.latestTicketState.command.transcript
        : "";
    const handoff = buildRobinhoodAgentHandoff(transcriptForHandoff);

    return renderCard(
      "Robinhood Agent Handoff",
      handoff.supported
        ? [
            "Copy/paste prompt:",
            handoff.prompt ?? "",
            handoff.message,
            "StreetSpeak did not send anything to Robinhood.",
            "StreetSpeak did not review the order.",
            "StreetSpeak did not place an order.",
            "Do not place anything unless separately confirmed inside Robinhood Agent.",
            "This is not investment advice."
          ]
        : [
            handoff.message,
            "No live broker order was placed.",
            [
              "No Robinhood order review, order placement, cancel order,",
              "or live execution command exists in StreetSpeak CLI."
            ].join(" ")
          ],
      state.useColor
    );
  }

  if (lower === "smoke") {
    const result = await runRobinhoodCommand(["smoke"], runtime);
    const lines = result.stdout.trimEnd().split("\n");

    return renderCard("Robinhood Smoke Status", lines, state.useColor);
  }

  if (lower === "yes") {
    return submitInteractiveConfirmation("yes", state, runtime);
  }

  if (lower.startsWith("confirm ")) {
    const confirmationText = transcript.slice("confirm ".length).trim();

    return submitInteractiveConfirmation(confirmationText, state, runtime);
  }

  state.latestTranscript = transcript;
  state.turnCount += 1;

  const deskState = await createMockTradingDeskTurn(transcript, {
    session: state.session,
    commandId: `cli-session-command-${state.turnCount}`,
    ticketId: `cli-session-ticket-${state.turnCount}`,
    challengeId: `cli-session-challenge-${state.turnCount}`,
    source: state.commandSource,
    ...(runtime.now === undefined ? {} : { now: runtime.now }),
    ...(runtime.challengeCode === undefined
      ? {}
      : { challengeCode: runtime.challengeCode })
  });

  state.latestState = deskState;
  if (deskState.ticket) {
    state.latestTicketState = deskState;
  }

  return renderInteractiveDeskState(deskState, state.useColor);
}

async function submitInteractiveConfirmation(
  confirmationText: string,
  state: InteractiveSessionState,
  runtime: StreetSpeakCliRuntime
): Promise<readonly string[]> {
  if (!state.latestState?.ticket || !state.latestState.challenge) {
    return renderCard(
      "Confirmation Rejected",
      [
        "No exact mock confirmation challenge is pending.",
        "Run buy 5 HOOD to create a mock ticket first.",
        "No live broker order was placed."
      ],
      state.useColor
    );
  }

  const confirmedState = await submitMockTradingDeskConfirmation(
    state.latestState,
    confirmationText,
    {
      ...(runtime.now === undefined ? {} : { now: runtime.now })
    }
  );
  state.latestState = confirmedState;
  if (confirmedState.ticket) {
    state.latestTicketState = confirmedState;
  }

  if (confirmedState.status !== "mock_submitted") {
    return renderConfirmationRejectedCard(confirmedState, state.useColor);
  }

  state.latestReceipt = createSessionReceipt(confirmedState, runtime.now);

  return [
    ...renderMockSubmissionCard(confirmedState, state.useColor),
    "",
    ...renderReceiptCard(state.latestReceipt, state.useColor)
  ];
}

function renderStartupScreen(useColor: boolean): string {
  const title = style("StreetSpeak AI", "boldCyan", useColor);
  const accent = style(
    "========================================",
    "blue",
    useColor
  );
  const status = [
    `${style("[MOCK]", "cyan", useColor)} Mock trading desk: available`,
    `${style(
      "[READ-ONLY]",
      "cyan",
      useColor
    )} Robinhood read-only: unavailable/unconfigured by default`,
    `${style("[LOCKED]", "cyan", useColor)} Live trading: unavailable`
  ];
  const safety = [
    "No live trading",
    "No order review",
    "No order placement",
    "Manual Robinhood Agent handoff only"
  ].join(" | ");

  return [
    "",
    accent,
    title,
    "Voice-native trading desk for AI agents",
    accent,
    ...status,
    `Safety: ${safety}`,
    "Type help for commands. Paste dictation transcripts as text. Type exit to close.",
    ""
  ].join("\n");
}

function renderStatusCard(useColor: boolean): readonly string[] {
  return renderCard(
    "Status",
    [
      "Mock trading desk: available",
      "Robinhood fixture explorer: available in the web app",
      "Robinhood read-only: unavailable/unconfigured by default",
      "Live trading: unavailable",
      "Order review: unavailable",
      "Order placement: unavailable",
      "Cancel order: unavailable",
      "Execution dry-run: available",
      "Execution manual handoff: available",
      "Execution kill switch: active",
      "Execution exact confirmation required: true",
      "Broker execution future-gated: true",
      "Credentials stored by StreetSpeak: false",
      "Raw MCP output printed: false",
      "Investment advice/trade recommendations: unavailable"
    ],
    useColor
  );
}

function renderInteractiveDeskState(
  state: MockTradingDeskState,
  useColor: boolean
): readonly string[] {
  if (state.status === "answered") {
    if (state.parse.kind === "portfolio_question") {
      return renderCard(
        "Portfolio Summary",
        [
          state.answer ?? state.message,
          "Source: mock/static data only.",
          "Mock only. No live broker order was placed.",
          "This is not investment advice."
        ],
        useColor
      );
    }

    return renderCard(
      "Quote Result",
      [
        state.answer ?? state.message,
        "Source: mock/static data only.",
        "MOCK STATIC QUOTE - not real market data.",
        "No live broker order was placed.",
        "This is not investment advice."
      ],
      useColor
    );
  }

  if (state.status === "unsupported" || state.status === "invalid") {
    return renderCard(
      state.status === "invalid"
        ? "Clarification Needed"
        : "Unsupported Command",
      [
        state.message,
        "No final ticket created.",
        "No live broker order was placed.",
        "Type help for supported session commands."
      ],
      useColor
    );
  }

  if (state.ticket && state.safetyReview && state.challenge) {
    return [
      ...renderMockTicketCard(state, useColor),
      "",
      ...renderSafetyReviewCard(state, useColor),
      "",
      ...renderExactConfirmationCard(state, useColor)
    ];
  }

  return renderCard(
    "StreetSpeak Response",
    [state.message, "No live broker order was placed."],
    useColor
  );
}

function renderMockTicketCard(
  state: MockTradingDeskState,
  useColor: boolean
): readonly string[] {
  const ticket = state.ticket;

  if (!ticket) {
    return renderCard(
      "Mock Ticket",
      ["No mock ticket is available.", "No live broker order was placed."],
      useColor
    );
  }

  const lines = [
    `Symbol: ${ticket.symbol}`,
    `Side: ${ticket.side.toUpperCase()}`,
    `Quantity: ${ticket.quantity}`,
    `Order type: ${ticket.type.toUpperCase()}`,
    ...(ticket.limitPrice === undefined
      ? []
      : [`Limit price: ${formatMoney(ticket.limitPrice)}`]),
    `Time in force: ${ticket.timeInForce.toUpperCase()}`,
    `Mode: ${ticket.mode}`,
    `Ticket id: ${ticket.id}`,
    "Mock only.",
    "No live broker order was placed."
  ];

  return renderCard("Mock Ticket", lines, useColor);
}

function renderSafetyReviewCard(
  state: MockTradingDeskState,
  useColor: boolean
): readonly string[] {
  const safetyReview = state.safetyReview;

  if (!safetyReview) {
    return renderCard(
      "Safety Review",
      ["No safety review is available.", "No live broker order was placed."],
      useColor
    );
  }

  return renderCard(
    "Safety Review",
    [
      `Live trading enabled: ${safetyReview.liveTradingEnabled}`,
      `Requires exact mock confirmation: ${safetyReview.requiresExplicitConfirmation}`,
      ...safetyReview.warnings.map((warning) => `Warning: ${warning}`),
      ...safetyReview.blocks.map((block) => `Block: ${block}`),
      "StreetSpeak does not review, place, or cancel Robinhood orders."
    ],
    useColor
  );
}

function renderExactConfirmationCard(
  state: MockTradingDeskState,
  useColor: boolean
): readonly string[] {
  const challenge = state.challenge;

  if (!challenge) {
    return renderCard(
      "Exact Confirmation Required",
      ["No exact confirmation challenge is available."],
      useColor
    );
  }

  return renderCard(
    "Exact Confirmation Required",
    [
      "Type confirm <exact phrase> using the phrase below.",
      challenge.requiredPhrase,
      "Generic confirmations like yes, do it, or confirmed are rejected.",
      "Mock submission only. No live broker order will be placed.",
      "After mock submission, type receipt for a copy-friendly receipt or handoff for a manual Robinhood Agent prompt."
    ],
    useColor
  );
}

function renderConfirmationRejectedCard(
  state: MockTradingDeskState,
  useColor: boolean
): readonly string[] {
  const reason = state.confirmation?.accepted
    ? "unknown"
    : (state.confirmation?.reason ?? "unknown");

  return renderCard(
    "Confirmation Rejected",
    [
      state.message,
      `Reason: ${reason}`,
      "Use confirm <exact phrase> with the pending challenge phrase/code.",
      "No live broker order was placed."
    ],
    useColor
  );
}

function renderMockSubmissionCard(
  state: MockTradingDeskState,
  useColor: boolean
): readonly string[] {
  return renderCard(
    "Mock Submission Complete",
    [
      state.message,
      `Ticket: ${state.ticket ? summarizeTicket(state.ticket) : "unavailable"}`,
      `Mock order id: ${state.brokerResponse?.id ?? "unavailable"}`,
      `Mock broker status: ${state.brokerResponse?.status ?? "unavailable"}`,
      `Live execution available: ${
        state.brokerResponse?.liveExecutionAvailable ?? false
      }`,
      "No live broker order was placed."
    ],
    useColor
  );
}

function createSessionReceipt(
  state: MockTradingDeskState,
  now: Date | undefined
): SessionReceipt {
  return {
    generatedAt: (now ?? new Date()).toISOString(),
    commandTranscript: state.command.transcript,
    ticketSummary: state.ticket ? summarizeTicket(state.ticket) : "unavailable",
    mockOrderId: state.brokerResponse?.id ?? "unavailable",
    brokerStatus: state.brokerResponse?.status ?? "unavailable",
    statement: "No live broker order was placed.",
    liveTradingEnabled: false,
    rawAudioStored: false,
    auditEventCount: state.auditTimeline.length
  };
}

function renderReceiptCard(
  receipt: SessionReceipt,
  useColor: boolean
): readonly string[] {
  return renderCard(
    "Receipt",
    [
      "Mock Only / No Live Trading",
      `Generated: ${receipt.generatedAt}`,
      `Command: ${receipt.commandTranscript}`,
      `Ticket: ${receipt.ticketSummary}`,
      `Mock order id: ${receipt.mockOrderId}`,
      `Mock broker status: ${receipt.brokerStatus}`,
      receipt.statement,
      `Live trading enabled: ${receipt.liveTradingEnabled}`,
      `Raw audio stored: ${receipt.rawAudioStored}`,
      `Redacted audit events: ${receipt.auditEventCount}`,
      "Copy/paste safe receipt: no broker credentials, account IDs, raw MCP output, or raw audio included."
    ],
    useColor
  );
}

function renderTranscriptBridgeState(
  state: MockTradingDeskState,
  useColor: boolean
): string[] {
  return [
    ...renderCard(
      "Voice Transcript Bridge",
      [
        "Input source: text transcript.",
        `Command source: ${state.command.source}.`,
        "Routed through the mock-only StreetSpeak command handler.",
        "StreetSpeak stores no transcript copy and no raw audio.",
        "No live broker order was placed."
      ],
      useColor
    ),
    ...renderInteractiveDeskState(state, useColor)
  ];
}

function renderCard(
  title: string,
  body: readonly string[],
  useColor: boolean
): readonly string[] {
  const divider = style(
    "----------------------------------------",
    "blue",
    useColor
  );

  return [
    "",
    divider,
    style(title, "boldCyan", useColor),
    divider,
    ...body.map((line) => (line ? `  ${line}` : "")),
    divider
  ];
}

async function emitSessionResponse(
  state: InteractiveSessionState,
  lines: readonly string[],
  runtime: StreetSpeakCliRuntime
): Promise<void> {
  const response = `${lines.join("\n")}\n`;
  await emit(state, response);

  if (!state.speakEnabled || state.suppressSpeakForCurrentResponse) {
    state.suppressSpeakForCurrentResponse = false;
    return;
  }

  try {
    const statusLine = await speakStatusLine(
      buildSafeSpeakBackText(lines),
      runtime,
      {
        ttsProvider: state.ttsProvider,
        macosVoice: state.macosVoice
      }
    );
    await emit(state, `${statusLine}\n`);
  } catch {
    await emit(
      state,
      "StreetSpeak TTS: speak-back failed safely. No raw audio stored.\n"
    );
  }
}

async function emit(
  state: InteractiveSessionState,
  text: string
): Promise<void> {
  state.lines.push(text);
  await state.writeOutput?.(text);
}

function toAsyncIterator(input: InteractiveInput): AsyncIterator<string> {
  if (isAsyncIterable(input)) {
    return input[Symbol.asyncIterator]();
  }

  const iterator = input[Symbol.iterator]();

  return {
    async next() {
      return iterator.next();
    }
  };
}

function isAsyncIterable(
  value: InteractiveInput
): value is AsyncIterable<string> {
  return Symbol.asyncIterator in Object(value);
}

function summarizeTicket(ticket: MockTradingDeskState["ticket"]): string {
  if (!ticket) {
    return "unavailable";
  }

  const limitClause =
    ticket.limitPrice === undefined
      ? ""
      : ` @ ${formatMoney(ticket.limitPrice)}`;

  return `${ticket.side.toUpperCase()} ${ticket.quantity} ${
    ticket.symbol
  } ${ticket.type.toUpperCase()}${limitClause} ${ticket.timeInForce.toUpperCase()} (${
    ticket.mode
  })`;
}

function style(
  text: string,
  variant: "blue" | "cyan" | "boldCyan",
  useColor: boolean
): string {
  if (!useColor) {
    return text;
  }

  const code =
    variant === "boldCyan"
      ? "\u001B[1;96m"
      : variant === "cyan"
        ? "\u001B[96m"
        : "\u001B[94m";

  return `${code}${text}\u001B[0m`;
}

function stripAnsi(value: string): string {
  const escape = String.fromCharCode(27);

  return value
    .replace(new RegExp(`${escape}\\[[0-9;]*m`, "gu"), "")
    .replace(new RegExp(`${escape}c`, "gu"), "");
}

export function buildMacOsSayCommand(
  text: string,
  voice?: string
): {
  readonly command: "say";
  readonly args: readonly string[];
} {
  const normalizedVoice = normalizeOptionalString(voice);

  return {
    command: "say",
    args: normalizedVoice ? ["-v", normalizedVoice, text] : [text]
  };
}

export function createTextToSpeechProvider(
  options: TextToSpeechProviderOptions = {}
): TextToSpeechProvider {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const provider = resolveTextToSpeechProviderKind(
    options.provider,
    env,
    platform
  );

  if (provider === "elevenlabs") {
    return createElevenLabsTextToSpeechProvider({
      ...options,
      env,
      platform
    });
  }

  return createLocalTextToSpeechProvider({
    ...options,
    env,
    platform,
    provider
  });
}

function createLocalTextToSpeechProvider(
  options: TextToSpeechProviderOptions
): TextToSpeechProvider {
  const platform = options.platform ?? process.platform;

  if (options.provider !== "stdout_fallback" && platform === "darwin") {
    const env = options.env ?? process.env;
    const voice =
      normalizeOptionalString(options.macosVoice) ??
      normalizeOptionalString(env.STREETSPEAK_MACOS_VOICE);

    return {
      kind: "macos_say",
      async speak(text: string): Promise<TextToSpeechResult> {
        const command = buildMacOsSayCommand(text, voice);
        await (options.runCommand ?? runCommand)(command.command, command.args);

        return {
          provider: "macos_say",
          text,
          rawAudioStoredByStreetSpeak: false,
          command: command.command,
          args: command.args,
          ...(voice === undefined ? {} : { voice })
        };
      }
    };
  }

  return createStdoutFallbackTextToSpeechProvider();
}

function createStdoutFallbackTextToSpeechProvider(): TextToSpeechProvider {
  return {
    kind: "stdout_fallback",
    async speak(text: string): Promise<TextToSpeechResult> {
      return {
        provider: "stdout_fallback",
        text,
        rawAudioStoredByStreetSpeak: false
      };
    }
  };
}

function createElevenLabsTextToSpeechProvider(
  options: TextToSpeechProviderOptions
): TextToSpeechProvider {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;

  return {
    kind: "elevenlabs",
    async speak(text: string): Promise<TextToSpeechResult> {
      const safeText = sanitizeTextForRemoteTts(text);
      const apiKey = normalizeOptionalString(env.ELEVENLABS_API_KEY);
      const voiceId = normalizeOptionalString(env.ELEVENLABS_VOICE_ID);
      if (apiKey === undefined || voiceId === undefined) {
        const missing = [
          ...(apiKey === undefined ? ["ELEVENLABS_API_KEY"] : []),
          ...(voiceId === undefined ? ["ELEVENLABS_VOICE_ID"] : [])
        ];

        return speakWithElevenLabsFallback(
          safeText,
          options,
          `missing ${formatMissingEnvList(missing)}`
        );
      }

      if (platform !== "darwin") {
        return speakWithElevenLabsFallback(
          safeText,
          options,
          "local playback unavailable on this platform"
        );
      }

      const fetchImplementation = options.fetch ?? globalThis.fetch;

      if (!fetchImplementation) {
        return speakWithElevenLabsFallback(
          safeText,
          options,
          "fetch is unavailable in this runtime"
        );
      }

      const configuredApiKey = apiKey;
      const configuredVoiceId = voiceId;
      const modelId =
        normalizeOptionalString(env.ELEVENLABS_MODEL_ID) ??
        "eleven_multilingual_v2";
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
        configuredVoiceId
      )}`;

      try {
        const response = await fetchImplementation(url, {
          method: "POST",
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": configuredApiKey
          },
          body: JSON.stringify({
            text: safeText,
            model_id: modelId
          })
        });

        if (!response.ok) {
          return speakWithElevenLabsFallback(
            safeText,
            options,
            `request failed with HTTP ${response.status}`
          );
        }

        const audio = await response.arrayBuffer();

        if (audio.byteLength === 0) {
          return speakWithElevenLabsFallback(
            safeText,
            options,
            "empty audio response"
          );
        }

        const playback = await playElevenLabsAudio(audio, options, platform);

        return {
          provider: "elevenlabs",
          requestedProvider: "elevenlabs",
          text: safeText,
          rawAudioStoredByStreetSpeak: false,
          command: playback.command,
          args: playback.args,
          modelId
        };
      } catch {
        return speakWithElevenLabsFallback(
          safeText,
          options,
          "request or local playback failed"
        );
      }
    }
  };
}

async function speakWithElevenLabsFallback(
  text: string,
  options: TextToSpeechProviderOptions,
  fallbackReason: string
): Promise<TextToSpeechResult> {
  const fallbackProvider = createLocalTextToSpeechProvider({
    ...options,
    provider: undefined
  });
  const result = await fallbackProvider.speak(text);

  return {
    ...result,
    requestedProvider: "elevenlabs",
    fallbackFrom: "elevenlabs",
    fallbackReason
  };
}

async function playElevenLabsAudio(
  audio: ArrayBuffer,
  options: TextToSpeechProviderOptions,
  platform: NodeJS.Platform | string
): Promise<{
  readonly command: "afplay";
  readonly args: readonly string[];
}> {
  if (platform !== "darwin") {
    throw new Error("local audio playback unavailable on this platform");
  }

  const directory = await mkdtemp(path.join(tmpdir(), "streetspeak-tts-"));
  const audioPath = path.join(directory, "elevenlabs.mp3");
  const playback = {
    command: "afplay" as const,
    args: [audioPath] as const
  };

  try {
    await writeFile(audioPath, new Uint8Array(audio));
    await (options.runCommand ?? runCommand)(playback.command, playback.args);

    return playback;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function resolveTextToSpeechProviderKind(
  provider: TextToSpeechProviderKind | undefined,
  env: Readonly<Record<string, string | undefined>>,
  platform: NodeJS.Platform | string
): TextToSpeechProviderKind {
  const envProvider = normalizeTextToSpeechProvider(
    env.STREETSPEAK_TTS_PROVIDER
  );

  return (
    provider ??
    envProvider ??
    (platform === "darwin" ? "macos_say" : "stdout_fallback")
  );
}

function sanitizeTextForRemoteTts(text: string): string {
  const collapsed = text.replace(/\s+/gu, " ").trim();
  const redacted = collapsed
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gu, "Bearer [redacted]")
    .replace(
      /\b(api[_-]?key|authorization|password|secret|token)\s*[:=]\s*[^,\s]+/giu,
      "$1 [redacted]"
    )
    .replace(
      /\b(account(?:[_-]?(?:id|number))?)\s*[:=]\s*[^,\s]+/giu,
      "$1 [redacted]"
    )
    .replace(/\b(order(?:[_-]?id)?)\s*[:=]\s*[^,\s]+/giu, "$1 [redacted]")
    .replace(/\braw MCP output\b/giu, "redacted MCP output");

  if (redacted.length <= 500) {
    return redacted;
  }

  return `${redacted.slice(0, 497)}...`;
}

function buildSafeSpeakBackText(lines: readonly string[]): string {
  const text = stripAnsi(lines.join("\n"));
  const normalized = text.toLowerCase();

  if (normalized.includes("robinhood agent handoff")) {
    return "Handoff prompt is ready. StreetSpeak did not send, review, place, or cancel an order.";
  }

  if (normalized.includes("robinhood smoke status")) {
    return "Robinhood read-only smoke status is ready. Raw MCP output was not spoken.";
  }

  if (normalized.includes("mock submission complete")) {
    return "Mock submission receipt is ready. No live broker order was placed.";
  }

  if (normalized.includes("confirmation rejected")) {
    return "Confirmation rejected. Use the exact mock confirmation phrase and code. No live broker order was placed.";
  }

  if (
    normalized.includes("portfolio summary") ||
    normalized.includes("mock portfolio") ||
    normalized.includes("mock buying power")
  ) {
    return "Mock portfolio summary is ready. Source is mock static data only. No live broker order was placed.";
  }

  if (normalized.includes("status")) {
    return "StreetSpeak status is ready. Live trading, order review, order placement, and cancel order remain unavailable.";
  }

  if (
    normalized.includes("mock ticket") ||
    normalized.includes("awaiting_confirmation") ||
    normalized.includes("exact confirmation required")
  ) {
    return "Mock ticket created. Exact confirmation is required before mock submission. No live broker order was placed.";
  }

  if (
    normalized.includes("quote result") ||
    normalized.includes("mock static quote")
  ) {
    return "Mock quote result is ready. Source is mock static data only. No live broker order was placed.";
  }

  if (normalized.includes("receipt")) {
    return "Mock receipt is ready. No live broker order was placed.";
  }

  if (normalized.includes("help")) {
    return "StreetSpeak help is ready. No live broker order was placed.";
  }

  return "StreetSpeak response is ready. No live broker order was placed.";
}

function renderTextToSpeechSetupNotice(
  runtime: StreetSpeakCliRuntime,
  options: Pick<InteractiveSessionState, "macosVoice" | "ttsProvider">
): readonly string[] {
  if (runtime.textToSpeechProvider) {
    return [];
  }

  const env = runtime.env ?? process.env;
  const platform = runtime.platform ?? process.platform;
  const provider = resolveTextToSpeechProviderKind(
    options.ttsProvider,
    env,
    platform
  );

  if (provider !== "elevenlabs") {
    const voice =
      normalizeOptionalString(options.macosVoice) ??
      normalizeOptionalString(env.STREETSPEAK_MACOS_VOICE);

    return voice && platform === "darwin" ? [`macOS voice: ${voice}.`] : [];
  }

  const missing = [
    ...(normalizeOptionalString(env.ELEVENLABS_API_KEY) === undefined
      ? ["ELEVENLABS_API_KEY"]
      : []),
    ...(normalizeOptionalString(env.ELEVENLABS_VOICE_ID) === undefined
      ? ["ELEVENLABS_VOICE_ID"]
      : [])
  ];

  if (missing.length === 0) {
    return [
      "ElevenLabs is selected for CLI speak-back only.",
      "Only short safe summaries are sent to remote TTS."
    ];
  }

  return [
    `ElevenLabs setup incomplete: missing ${formatMissingEnvList(missing)}.`,
    "Speak-back will fall back to local macOS say or stdout."
  ];
}

function describeTextToSpeechPreference(
  runtime: StreetSpeakCliRuntime,
  options: Pick<InteractiveSessionState, "macosVoice" | "ttsProvider">
): string {
  if (runtime.textToSpeechProvider) {
    return formatTextToSpeechProviderKind(runtime.textToSpeechProvider.kind);
  }

  const env = runtime.env ?? process.env;
  const platform = runtime.platform ?? process.platform;

  return formatTextToSpeechProviderKind(
    resolveTextToSpeechProviderKind(options.ttsProvider, env, platform)
  );
}

function normalizeOptionalString(
  value: string | undefined
): string | undefined {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function normalizeTextToSpeechProvider(
  value: string | undefined
): TextToSpeechProviderKind | undefined {
  const normalized = value?.trim().toLowerCase().replaceAll("-", "_");

  switch (normalized) {
    case "elevenlabs":
    case "eleven_labs":
      return "elevenlabs";
    case "macos":
    case "macos_say":
    case "say":
      return "macos_say";
    case "stdout":
    case "stdout_fallback":
      return "stdout_fallback";
    default:
      return undefined;
  }
}

function formatTextToSpeechProviderKind(
  provider: TextToSpeechProviderKind
): string {
  switch (provider) {
    case "elevenlabs":
      return "ElevenLabs";
    case "macos_say":
      return "macOS say";
    case "stdout_fallback":
      return "stdout fallback";
  }
}

function formatMissingEnvList(items: readonly string[]): string {
  if (items.length === 1) {
    return items[0] ?? "required environment variable";
  }

  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function buildRobinhoodAgentHandoff(
  transcript: string
): RobinhoodHandoffResult {
  const normalized = transcript.trim().toLowerCase();

  if (!normalized) {
    return {
      supported: false,
      message:
        'Provide a share-quantity equity command, such as: streetspeak robinhood handoff "buy 5 HOOD".'
    };
  }

  if (
    /\b(option|options|call|calls|put|puts|contract|contracts|strike|expiry|expiration)\b/u.test(
      normalized
    )
  ) {
    return {
      supported: false,
      message:
        "Options handoff is unsupported/future. StreetSpeak CLI only builds manual handoff prompts for share-quantity equity commands."
    };
  }

  const parse = parseMockTradingCommand(transcript);

  if (parse.kind !== "order_ticket") {
    return {
      supported: false,
      message:
        parse.kind === "unsupported" || parse.kind === "invalid"
          ? `${parse.message} No Robinhood Agent handoff prompt was created.`
          : "No Robinhood Agent handoff prompt was created."
    };
  }

  const shareLabel = parse.order.quantity === 1 ? "share" : "shares";
  const action =
    parse.order.side === "buy"
      ? `long equity order to buy ${parse.order.quantity} ${shareLabel} of ${parse.order.symbol}`
      : `equity order to sell ${parse.order.quantity} ${shareLabel} of ${parse.order.symbol}`;
  const limitClause =
    parse.order.type === "limit"
      ? ` as a limit order at ${formatMoney(parse.order.limitPrice ?? 0)}`
      : "";
  const prompt = [
    "ASK YOUR ROBINHOOD AGENT:",
    `Build or review a ${action}${limitClause}.`,
    "Manual request only. Do not place the order unless I separately confirm inside the Robinhood Agent flow.",
    "Before any order action, show the current quote, estimated cost, buying-power impact, and pre-trade warnings.",
    "StreetSpeak context: mock-only CLI handoff. StreetSpeak did not send this to Robinhood, did not review the order, and did not place an order."
  ].join("\n");

  return {
    supported: true,
    prompt,
    message:
      "Manual handoff prompt only. StreetSpeak did not send this to Robinhood, did not review the order, and did not place an order."
  };
}

function parseCliArgs(argv: readonly string[]): {
  readonly speak: boolean;
  readonly ttsProvider?: TextToSpeechProviderKind;
  readonly macosVoice?: string;
  readonly transcriptFilePath?: string;
  readonly positionals: readonly string[];
  readonly error?: string;
} {
  const positionals: string[] = [];
  let speak = false;
  let ttsProvider: TextToSpeechProviderKind | undefined;
  let macosVoice: string | undefined;
  let transcriptFilePath: string | undefined;
  let parseError: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === undefined) {
      continue;
    }

    if (arg === "--speak") {
      speak = true;
      continue;
    }

    if (arg === "--provider" || arg === "--tts") {
      const nextArg = argv[index + 1];
      if (!nextArg || nextArg.startsWith("--")) {
        parseError = `Provide a provider after ${arg}. Use elevenlabs, macos, or stdout.`;
        continue;
      }

      const parsedProvider = normalizeTextToSpeechProvider(nextArg);
      if (parsedProvider === undefined) {
        parseError = `Unsupported TTS provider: ${nextArg}. Use elevenlabs, macos, or stdout.`;
        index += 1;
        continue;
      }

      ttsProvider = parsedProvider;
      index += 1;
      continue;
    }

    if (arg.startsWith("--provider=")) {
      const value = arg.slice("--provider=".length);
      const parsedProvider = normalizeTextToSpeechProvider(value);
      if (parsedProvider === undefined) {
        parseError = `Unsupported TTS provider: ${value}. Use elevenlabs, macos, or stdout.`;
        continue;
      }

      ttsProvider = parsedProvider;
      continue;
    }

    if (arg.startsWith("--tts=")) {
      const value = arg.slice("--tts=".length);
      const parsedProvider = normalizeTextToSpeechProvider(value);
      if (parsedProvider === undefined) {
        parseError = `Unsupported TTS provider: ${value}. Use elevenlabs, macos, or stdout.`;
        continue;
      }

      ttsProvider = parsedProvider;
      continue;
    }

    if (arg === "--voice") {
      const nextArg = argv[index + 1];
      if (!nextArg || nextArg.startsWith("--")) {
        parseError = "Provide a macOS voice name after --voice.";
        continue;
      }

      macosVoice = nextArg;
      index += 1;
      continue;
    }

    if (arg.startsWith("--voice=")) {
      macosVoice = arg.slice("--voice=".length);
      continue;
    }

    if (arg === "--transcript-file") {
      const nextArg = argv[index + 1];
      if (!nextArg || nextArg.startsWith("--")) {
        transcriptFilePath = "";
        continue;
      }

      transcriptFilePath = nextArg;
      index += 1;
      continue;
    }

    if (arg.startsWith("--transcript-file=")) {
      transcriptFilePath = arg.slice("--transcript-file=".length);
      continue;
    }

    positionals.push(arg);
  }

  return {
    speak,
    ...(ttsProvider === undefined ? {} : { ttsProvider }),
    ...(macosVoice === undefined ? {} : { macosVoice }),
    ...(transcriptFilePath === undefined ? {} : { transcriptFilePath }),
    positionals,
    ...(parseError === undefined ? {} : { error: parseError })
  };
}

async function runRobinhoodCommand(
  args: readonly string[],
  runtime: StreetSpeakCliRuntime
): Promise<CliRunResult> {
  const [subcommand, ...rest] = args;

  if (subcommand === "smoke") {
    const { client, importFailed } = await resolveRobinhoodMcpClient(runtime);
    const summary = await runRobinhoodMcpReadOnlySmokeTest({ client });
    const lines = [
      ...(importFailed
        ? ["MCP client module import failed; details redacted."]
        : []),
      ...summary.lines,
      `status: ${summary.status}`,
      `raw payload included: ${summary.rawPayloadIncluded}`,
      `live execution available: ${summary.liveExecutionAvailable}`,
      `order review available: ${summary.orderReviewAvailable}`,
      `order placement available: ${summary.orderPlacementAvailable}`,
      `cancel order available: ${summary.cancelOrderAvailable}`
    ];

    if (!client) {
      lines.push(
        "MCP unavailable/unconfigured: configure any real Robinhood MCP client outside StreetSpeak. Do not pass credentials, tokens, account IDs, MCP URLs, or raw MCP output through CLI commands."
      );
    }

    return ok(lines);
  }

  if (subcommand === "handoff") {
    const transcript = rest.join(" ").trim();
    const handoff = buildRobinhoodAgentHandoff(transcript);
    const lines = handoff.supported
      ? renderRobinhoodHandoffOutput(handoff)
      : [
          handoff.message,
          "No live broker order was placed. No Robinhood order review, order placement, cancel order, or live execution command exists in StreetSpeak CLI."
        ];

    return ok(lines);
  }

  return error(
    "Unknown Robinhood command. Available Robinhood CLI commands: smoke, handoff. No order review, order placement, or cancel-order command exists."
  );
}

async function runExecuteCommand(
  args: readonly string[],
  runtime: StreetSpeakCliRuntime
): Promise<CliRunResult> {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "status") {
    return ok(renderExecutionStatusLines());
  }

  if (["live", "place", "review", "cancel"].includes(subcommand)) {
    const blockedGateway = new BlockedLiveExecutionGateway();
    const blocked = blockedGateway.buildExecutionPlan({
      transcript: rest.join(" ").trim(),
      source: "cli",
      ...(runtime.now === undefined ? {} : { now: runtime.now })
    });
    const message = blocked.ok
      ? LIVE_EXECUTION_UNAVAILABLE_MESSAGE
      : blocked.message;

    return error(
      [
        message,
        `Forbidden execute subcommand: ${subcommand}.`,
        "No execute live, place, review, or cancel command is available.",
        [
          "No Robinhood review_equity_order, place_equity_order,",
          "cancel_equity_order, review_option_order, place_option_order,",
          "or cancel_option_order call was made."
        ].join(" "),
        "No live broker order was placed."
      ].join("\n")
    );
  }

  if (!["plan", "dry-run", "handoff"].includes(subcommand)) {
    return error(
      "Unknown execute command. Available execute commands: plan, dry-run, handoff, status. Live execution, order review, placement, and cancel remain unavailable."
    );
  }

  const transcript = rest.join(" ").trim();

  if (!transcript) {
    return error(
      `Provide a share-quantity equity command, such as: streetspeak execute ${subcommand} "buy 5 HOOD". No live broker order was placed.`
    );
  }

  if (subcommand === "handoff") {
    const gateway = createCliManualHandoffGateway(runtime);
    const planResult = createCliExecutionPlan(gateway, transcript, runtime, {
      includeChallenge: false
    });

    if (!planResult.ok) {
      return error(formatExecutionFailure(planResult));
    }

    const handoff = gateway.createManualHandoff(planResult.value);

    return handoff.ok
      ? ok(renderExecutionHandoffOutput(handoff.value))
      : error(formatExecutionFailure(handoff));
  }

  const gateway = createCliDryRunGateway(runtime);
  const planResult = createCliExecutionPlan(gateway, transcript, runtime, {
    includeChallenge: true
  });

  if (!planResult.ok) {
    return error(formatExecutionFailure(planResult));
  }

  if (subcommand === "plan") {
    return ok(renderExecutionPlanOutput(planResult.value));
  }

  const dryRun = gateway.submitDryRun(planResult.value);

  return dryRun.ok
    ? ok(renderExecutionDryRunOutput(dryRun.value))
    : error(formatExecutionFailure(dryRun));
}

function createCliExecutionPlan(
  gateway: ExecutionGateway,
  transcript: string,
  runtime: StreetSpeakCliRuntime,
  options: { readonly includeChallenge: boolean }
): ExecutionGatewayResult<ExecutionPlan> {
  const built = gateway.buildExecutionPlan({
    transcript,
    source: "cli",
    id: "cli-execution-plan",
    ticketId: "cli-execution-ticket",
    ...(runtime.now === undefined ? {} : { now: runtime.now })
  });

  if (!built.ok) {
    return built;
  }

  const reviewed = gateway.runSafetyChecks(built.value);

  if (!reviewed.ok || !options.includeChallenge) {
    return reviewed;
  }

  return gateway.createConfirmationChallenge(reviewed.value, {
    id: "cli-execution-challenge",
    ...(runtime.challengeCode === undefined
      ? {}
      : { code: runtime.challengeCode }),
    ...(runtime.now === undefined ? {} : { now: runtime.now })
  });
}

function createCliDryRunGateway(
  runtime: StreetSpeakCliRuntime
): DryRunExecutionGateway {
  return new DryRunExecutionGateway({
    now: () => runtime.now ?? new Date(),
    idFactory: (prefix) => `cli-${prefix}`
  });
}

function createCliManualHandoffGateway(
  runtime: StreetSpeakCliRuntime
): ManualHandoffExecutionGateway {
  return new ManualHandoffExecutionGateway({
    now: () => runtime.now ?? new Date(),
    idFactory: (prefix) => `cli-${prefix}`
  });
}

function renderExecutionStatusLines(): readonly string[] {
  const status = createExecutionReadinessStatus();

  return [
    "StreetSpeak execution status",
    `live execution: ${status.liveExecutionAvailable ? "available" : "unavailable"}`,
    `order review: ${status.orderReviewAvailable ? "available" : "unavailable"}`,
    `order placement: ${
      status.orderPlacementAvailable ? "available" : "unavailable"
    }`,
    `cancel order: ${status.cancelOrderAvailable ? "available" : "unavailable"}`,
    `dry-run: ${status.dryRunAvailable ? "available" : "unavailable"}`,
    `manual handoff: ${
      status.manualHandoffAvailable ? "available" : "unavailable"
    }`,
    `kill switch: ${status.killSwitchActive ? "active" : "inactive"}`,
    `exact confirmation required: ${status.exactConfirmationRequired}`,
    `broker execution future-gated: ${status.brokerExecutionFutureGated}`,
    `live mode opt-in available: ${status.liveModeOptInAvailable}`,
    status.message,
    "No live broker order was placed."
  ];
}

function renderExecutionPlanOutput(plan: ExecutionPlan): readonly string[] {
  return [
    "========================================",
    "Execution Plan",
    "========================================",
    `command: ${JSON.stringify(plan.transcript)}`,
    `parse: ${plan.parse.kind}`,
    `lifecycle: ${plan.lifecycle.join(" -> ")}`,
    `ticket: ${formatExecutionTicket(plan)}`,
    `live execution available: ${!plan.liveExecutionBlocked}`,
    `order review available: ${plan.config.orderReviewEnabled}`,
    `cancel order available: ${plan.config.cancelOrderEnabled}`,
    `kill switch active: ${plan.config.killSwitchEnabled}`,
    `exact confirmation required: ${plan.config.requireExactConfirmation}`,
    `broker order reviewed: ${plan.brokerOrderReviewed}`,
    `broker order placed: ${plan.brokerOrderPlaced}`,
    `broker order canceled: ${plan.brokerOrderCanceled}`,
    "Safety gates:",
    ...plan.safetyGates.map(
      (gate) => `- ${gate.id}: ${gate.status} - ${gate.message}`
    ),
    ...(plan.challenge
      ? [
          "Exact confirmation phrase/code:",
          plan.challenge.requiredPhrase,
          "Generic confirmations like yes, do it, or confirmed are rejected."
        ]
      : []),
    "No live broker order was placed.",
    "This is not investment advice.",
    "========================================"
  ];
}

function renderExecutionDryRunOutput(
  result: ExecutionDryRunResult
): readonly string[] {
  return [
    "========================================",
    "Execution Dry Run",
    "========================================",
    `command: ${JSON.stringify(result.plan.transcript)}`,
    `ticket: ${formatExecutionTicket(result.plan)}`,
    `dry-run id: ${result.submission.id}`,
    `dry-run status: ${result.submission.lifecycleState}`,
    `live execution available: ${result.submission.liveExecutionAvailable}`,
    `broker order reviewed: ${result.submission.brokerOrderReviewed}`,
    `broker order placed: ${result.submission.brokerOrderPlaced}`,
    `broker order canceled: ${result.submission.brokerOrderCanceled}`,
    result.submission.message,
    result.submission.statement,
    "No Robinhood order review, order placement, cancel order, or live execution command was called.",
    "This is not investment advice.",
    "========================================"
  ];
}

function renderExecutionHandoffOutput(
  handoff: ExecutionManualHandoff
): readonly string[] {
  return [
    "========================================",
    "Execution Manual Handoff",
    "========================================",
    `command: ${JSON.stringify(handoff.plan.transcript)}`,
    `ticket: ${formatExecutionTicket(handoff.plan)}`,
    "Copy/paste prompt:",
    "",
    handoff.prompt,
    "",
    "Safety boundary:",
    handoff.message,
    `live execution available: ${handoff.liveExecutionAvailable}`,
    `broker order reviewed: ${handoff.brokerOrderReviewed}`,
    `broker order placed: ${handoff.brokerOrderPlaced}`,
    `broker order canceled: ${handoff.brokerOrderCanceled}`,
    handoff.statement,
    "Do not place anything unless separately confirmed inside Robinhood Agent.",
    "This is not investment advice.",
    "========================================"
  ];
}

function formatExecutionTicket(plan: ExecutionPlan): string {
  const ticket = plan.ticket;

  if (!ticket) {
    return plan.parse.kind === "unsupported"
      ? `unavailable (${plan.parse.reason})`
      : "unavailable";
  }

  const limitClause =
    ticket.limitPrice === undefined
      ? ""
      : ` @ ${formatMoney(ticket.limitPrice)}`;

  return `${ticket.side.toUpperCase()} ${ticket.quantity} ${
    ticket.symbol
  } ${ticket.type.toUpperCase()}${limitClause} ${ticket.timeInForce.toUpperCase()}`;
}

function formatExecutionFailure(failure: {
  readonly ok: false;
  readonly message: string;
}): string {
  return `${failure.message}\nNo live broker order was placed.`;
}

function renderRobinhoodHandoffOutput(
  handoff: RobinhoodHandoffResult
): readonly string[] {
  return [
    "========================================",
    "Robinhood Agent Manual Handoff",
    "========================================",
    "Copy/paste prompt:",
    "",
    handoff.prompt ?? "",
    "",
    "Safety boundary:",
    handoff.message,
    "Do not place anything unless separately confirmed inside Robinhood Agent.",
    "StreetSpeak CLI has no Robinhood order review, order placement, cancel order, or live execution command.",
    "No live broker order was placed.",
    "This is not investment advice.",
    "========================================"
  ];
}

async function readTranscriptFile(
  transcriptFilePath: string | undefined
): Promise<
  | {
      readonly ok: true;
      readonly lines: readonly string[];
    }
  | {
      readonly ok: false;
      readonly message: string;
    }
> {
  if (!transcriptFilePath) {
    return {
      ok: false,
      message:
        "Provide a transcript file path after --transcript-file. No transcript was submitted."
    };
  }

  try {
    const contents = await readFile(transcriptFilePath, "utf8");
    const lines = contents
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return {
        ok: false,
        message:
          "Transcript file did not contain any text command lines. No transcript was submitted."
      };
    }

    return {
      ok: true,
      lines
    };
  } catch {
    return {
      ok: false,
      message:
        "Unable to read transcript file. No transcript was stored or submitted."
    };
  }
}

function renderDemoState(state: MockTradingDeskState): string[] {
  const lines = [
    "StreetSpeak demo",
    `command: ${JSON.stringify(state.command.transcript)}`,
    `status: ${state.status}`
  ];

  if (state.status === "answered") {
    lines.push(
      `result: ${state.answer ?? state.message}`,
      "source: mock/static data only",
      "No live broker order was placed.",
      ...SAFE_DEMO_FOOTER
    );
    return lines;
  }

  if (state.status === "unsupported" || state.status === "invalid") {
    lines.push(
      `result: ${state.message}`,
      "No final ticket created.",
      "No live broker order was placed.",
      ...SAFE_DEMO_FOOTER
    );
    return lines;
  }

  if (state.ticket && state.safetyReview && state.challenge) {
    lines.push(
      "Mock ticket only. No live broker order was placed.",
      `ticket: ${state.ticket.side.toUpperCase()} ${state.ticket.quantity} ${state.ticket.symbol} ${state.ticket.type.toUpperCase()} ${state.ticket.timeInForce.toUpperCase()}`,
      `ticket id: ${state.ticket.id}`,
      "StreetSpeak safety review:",
      `live trading enabled: ${state.safetyReview.liveTradingEnabled}`,
      `requires exact mock confirmation: ${state.safetyReview.requiresExplicitConfirmation}`,
      ...state.safetyReview.warnings.map((warning) => `warning: ${warning}`),
      ...state.safetyReview.blocks.map((block) => `block: ${block}`),
      "Exact mock confirmation phrase/code:",
      state.challenge.requiredPhrase,
      "StreetSpeak CLI does not review, place, or cancel Robinhood orders.",
      ...SAFE_DEMO_FOOTER
    );
    return lines;
  }

  lines.push(
    state.message,
    "No live broker order was placed.",
    ...SAFE_DEMO_FOOTER
  );
  return lines;
}

async function resolveRobinhoodMcpClient(
  runtime: StreetSpeakCliRuntime
): Promise<{
  readonly client?: RobinhoodMcpReadOnlyClient;
  readonly importFailed: boolean;
}> {
  if (runtime.robinhoodMcpClient) {
    return {
      client: runtime.robinhoodMcpClient,
      importFailed: false
    };
  }

  const modulePath =
    runtime.env?.STREETSPEAK_ROBINHOOD_MCP_CLIENT_MODULE ??
    process.env.STREETSPEAK_ROBINHOOD_MCP_CLIENT_MODULE;

  if (!modulePath) {
    return {
      importFailed: false
    };
  }

  try {
    const imported = await (runtime.importModule ?? importModule)(
      toImportSpecifier(modulePath)
    );
    const candidate = readRobinhoodClientExport(imported);

    return candidate
      ? {
          client: candidate,
          importFailed: false
        }
      : {
          importFailed: true
        };
  } catch {
    return {
      importFailed: true
    };
  }
}

function readRobinhoodClientExport(
  imported: unknown
): RobinhoodMcpReadOnlyClient | undefined {
  if (!isRecord(imported)) {
    return undefined;
  }

  const candidate =
    imported.default ?? imported.client ?? imported.robinhoodMcpReadOnlyClient;

  if (isRobinhoodMcpReadOnlyClient(candidate)) {
    return candidate;
  }

  return undefined;
}

function isRobinhoodMcpReadOnlyClient(
  value: unknown
): value is RobinhoodMcpReadOnlyClient {
  return isRecord(value) && typeof value.callTool === "function";
}

async function importModule(modulePath: string): Promise<unknown> {
  return import(modulePath);
}

function toImportSpecifier(modulePath: string): string {
  if (/^[a-z]+:/iu.test(modulePath) || !path.isAbsolute(modulePath)) {
    return modulePath;
  }

  return pathToFileURL(modulePath).href;
}

async function speakStatusLine(
  text: string,
  runtime: StreetSpeakCliRuntime,
  options: Pick<InteractiveSessionState, "macosVoice" | "ttsProvider"> = {}
): Promise<string> {
  const provider = getTextToSpeechProvider(runtime, options);
  const result = await provider.speak(text);

  return renderTtsProviderLine(result);
}

function getTextToSpeechProvider(
  runtime: StreetSpeakCliRuntime,
  options: Pick<InteractiveSessionState, "macosVoice" | "ttsProvider"> = {}
): TextToSpeechProvider {
  return (
    runtime.textToSpeechProvider ??
    createTextToSpeechProvider({
      platform: runtime.platform,
      provider: options.ttsProvider,
      macosVoice: options.macosVoice,
      env: runtime.env,
      fetch: runtime.fetch,
      runCommand: runtime.runCommand
    })
  );
}

function renderTtsProviderLine(result: TextToSpeechResult): string {
  if (result.fallbackFrom === "elevenlabs") {
    return `StreetSpeak TTS: ElevenLabs unavailable (${result.fallbackReason ?? "setup incomplete"}); ${formatTextToSpeechProviderKind(result.provider)} used. No raw audio stored.`;
  }

  if (result.provider === "elevenlabs") {
    return "StreetSpeak TTS: ElevenLabs provider used for local playback. Temporary audio deleted. No raw audio stored.";
  }

  return result.provider === "macos_say"
    ? "StreetSpeak TTS: macOS say provider used. No raw audio stored."
    : "StreetSpeak TTS: stdout fallback used. No raw audio stored.";
}

async function runCommand(
  command: string,
  args: readonly string[]
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "ignore"
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} exited with code ${code ?? "unknown"}`));
    });
  });
}

function formatMoney(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function ok(lines: readonly string[]): CliRunResult {
  return {
    exitCode: 0,
    stdout: `${lines.join("\n")}\n`,
    stderr: ""
  };
}

function error(message: string): CliRunResult {
  return {
    exitCode: 1,
    stdout: "",
    stderr: `${message}\n`
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const argv = process.argv.slice(2);
  const parsed = parseCliArgs(argv);
  const command = parsed.positionals[0];
  const isInteractiveLaunch =
    (!command || command === "session") &&
    parsed.transcriptFilePath === undefined;
  const readline = isInteractiveLaunch
    ? createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: Boolean(process.stdin.isTTY && process.stdout.isTTY)
      })
    : undefined;

  readline?.on("SIGINT", () => {
    readline.close();
  });

  const result = await runStreetSpeakCli(
    argv,
    readline
      ? {
          interactiveInput: readline,
          writeOutput(text) {
            process.stdout.write(text);
          },
          color: Boolean(process.stdout.isTTY)
        }
      : {}
  );

  if (!readline) {
    process.stdout.write(result.stdout);
  }

  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
