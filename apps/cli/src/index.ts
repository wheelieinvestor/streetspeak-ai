#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  createMockTradingDeskTurn,
  parseMockTradingCommand,
  type MockTradingDeskState
} from "@streetspeak-ai/core";
import {
  runRobinhoodMcpReadOnlySmokeTest,
  type RobinhoodMcpReadOnlyClient
} from "@streetspeak-ai/brokers";

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
  readonly robinhoodMcpClient?: RobinhoodMcpReadOnlyClient;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly importModule?: (modulePath: string) => Promise<unknown>;
}

export type TextToSpeechProviderKind = "macos_say" | "stdout_fallback";

export interface TextToSpeechResult {
  readonly provider: TextToSpeechProviderKind;
  readonly text: string;
  readonly rawAudioStoredByStreetSpeak: false;
  readonly command?: "say";
  readonly args?: readonly string[];
}

export interface TextToSpeechProvider {
  readonly kind: TextToSpeechProviderKind;
  speak(text: string): Promise<TextToSpeechResult>;
}

export interface TextToSpeechProviderOptions {
  readonly platform?: NodeJS.Platform | string;
  readonly runCommand?: (
    command: string,
    args: readonly string[]
  ) => Promise<void>;
}

export interface RobinhoodHandoffResult {
  readonly supported: boolean;
  readonly prompt?: string;
  readonly message: string;
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
  "credentials stored by StreetSpeak: false",
  "raw MCP output printed: false",
  "investment advice/trade recommendations: unavailable"
] as const;

const HELP_LINES = [
  "StreetSpeak CLI",
  "",
  "Commands:",
  "  streetspeak status",
  '  streetspeak demo "show my portfolio"',
  '  streetspeak demo "what is HOOD trading at"',
  '  streetspeak demo "buy 5 HOOD" [--speak]',
  "  streetspeak robinhood smoke",
  '  streetspeak robinhood handoff "buy 5 HOOD"',
  '  streetspeak speak "text"',
  "",
  "No live trading, order review, order placement, or cancel-order command exists in this CLI."
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
  const [command, ...rest] = parsed.positionals;

  if (
    !command ||
    command === "help" ||
    command === "--help" ||
    command === "-h"
  ) {
    return ok([...HELP_LINES]);
  }

  if (command === "status") {
    return ok([...STATUS_LINES]);
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
      lines.push(await speakStatusLine(lines.join("\n"), runtime));
    }

    return ok(lines);
  }

  if (command === "robinhood") {
    return runRobinhoodCommand(rest, runtime);
  }

  if (command === "speak") {
    const text = rest.join(" ").trim();

    if (!text) {
      return error(
        'Provide text to speak, such as: streetspeak speak "mock ticket only"'
      );
    }

    const provider = getTextToSpeechProvider(runtime);
    const result = await provider.speak(text);
    const lines =
      result.provider === "stdout_fallback"
        ? [result.text, renderTtsProviderLine(result)]
        : [renderTtsProviderLine(result)];

    return ok(lines);
  }

  return error(`Unknown command: ${command}\n\n${HELP_LINES.join("\n")}`);
}

export function buildMacOsSayCommand(text: string): {
  readonly command: "say";
  readonly args: readonly string[];
} {
  return {
    command: "say",
    args: [text]
  };
}

export function createTextToSpeechProvider(
  options: TextToSpeechProviderOptions = {}
): TextToSpeechProvider {
  const platform = options.platform ?? process.platform;

  if (platform === "darwin") {
    return {
      kind: "macos_say",
      async speak(text: string): Promise<TextToSpeechResult> {
        const command = buildMacOsSayCommand(text);
        await (options.runCommand ?? runCommand)(command.command, command.args);

        return {
          provider: "macos_say",
          text,
          rawAudioStoredByStreetSpeak: false,
          command: command.command,
          args: command.args
        };
      }
    };
  }

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
  const prompt = `Ask your Robinhood Agent: Build or review a ${action}${limitClause}. Do not place the order unless I separately confirm inside the Robinhood Agent flow. Show me the estimated cost, current quote, buying power impact, and any pre-trade warnings first.`;

  return {
    supported: true,
    prompt,
    message:
      "Manual handoff prompt only. StreetSpeak did not send this to Robinhood, did not review the order, and did not place an order."
  };
}

function parseCliArgs(argv: readonly string[]): {
  readonly speak: boolean;
  readonly positionals: readonly string[];
} {
  const positionals: string[] = [];
  let speak = false;

  for (const arg of argv) {
    if (arg === "--speak") {
      speak = true;
      continue;
    }

    positionals.push(arg);
  }

  return {
    speak,
    positionals
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
      ? [
          handoff.prompt ?? "",
          handoff.message,
          "This is not investment advice. StreetSpeak CLI has no Robinhood order review, order placement, cancel order, or live execution command."
        ]
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
      "Mock ticket only. No live broker order placed.",
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
  runtime: StreetSpeakCliRuntime
): Promise<string> {
  const provider = getTextToSpeechProvider(runtime);
  const result = await provider.speak(text);

  return renderTtsProviderLine(result);
}

function getTextToSpeechProvider(
  runtime: StreetSpeakCliRuntime
): TextToSpeechProvider {
  return (
    runtime.textToSpeechProvider ??
    createTextToSpeechProvider({ platform: runtime.platform })
  );
}

function renderTtsProviderLine(result: TextToSpeechResult): string {
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
  const result = await runStreetSpeakCli(process.argv.slice(2));
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
