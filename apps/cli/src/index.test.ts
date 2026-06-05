import { describe, expect, it } from "vitest";
import {
  buildMacOsSayCommand,
  buildRobinhoodAgentHandoff,
  createTextToSpeechProvider,
  runStreetSpeakCli,
  type TextToSpeechProvider
} from "./index.js";
import type {
  RobinhoodMcpReadOnlyClient,
  RobinhoodMcpReadOnlyToolName
} from "@streetspeak-ai/brokers";

const FIXED_NOW = new Date("2026-01-01T00:00:00.000Z");

describe("StreetSpeak CLI", () => {
  it("launches interactive mode by default through injected input and output", async () => {
    const chunks: string[] = [];
    const result = await runStreetSpeakCli([], {
      interactiveInput: ["exit"],
      writeOutput(text) {
        chunks.push(text);
      }
    });

    expect(result.exitCode).toBe(0);
    expect(chunks.join("")).toBe(result.stdout);
    expect(result.stdout).toContain("StreetSpeak AI");
    expect(result.stdout).toContain(
      "Voice-native trading desk for AI agents"
    );
    expect(result.stdout).toContain("Mock trading desk: available");
    expect(result.stdout).toContain(
      "Robinhood read-only: unavailable/unconfigured by default"
    );
    expect(result.stdout).toContain("Live trading: unavailable");
    expect(result.stdout).toContain(
      "No live trading | No order review | No order placement | Manual Robinhood Agent handoff only"
    );
    expect(result.stdout).toContain("streetspeak ›");
    expect(result.stdout).toContain("StreetSpeak session closed");
  });

  it("launches interactive mode from the session command", async () => {
    const result = await runStreetSpeakCli(["session"], {
      interactiveInput: ["help", "exit"]
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("StreetSpeak AI");
    expect(result.stdout).toContain("Session commands:");
    expect(result.stdout).toContain("show my portfolio");
    expect(result.stdout).toContain("confirm <exact phrase>");
  });

  it("prints product and safety status", async () => {
    const result = await runStreetSpeakCli(["status"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("mock trading desk: available");
    expect(result.stdout).toContain(
      "Robinhood MCP read-only boundary: unavailable/unconfigured by default"
    );
    expect(result.stdout).toContain("live trading: unavailable");
    expect(result.stdout).toContain("order review: unavailable");
    expect(result.stdout).toContain("order placement: unavailable");
    expect(result.stdout).toContain("cancel order: unavailable");
    expect(result.stdout).toContain("raw MCP output printed: false");
  });

  it("prints readable mock portfolio command output", async () => {
    const result = await runStreetSpeakCli(["demo", "show my portfolio"], {
      now: FIXED_NOW
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("StreetSpeak demo");
    expect(result.stdout).toContain("$12,500.00 mock buying power");
    expect(result.stdout).toContain("MOCK PORTFOLIO - not a broker account");
    expect(result.stdout).toContain("No live broker order was placed.");
  });

  it("prints mock quote output", async () => {
    const result = await runStreetSpeakCli(
      ["demo", "what is HOOD trading at"],
      {
        now: FIXED_NOW
      }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("HOOD mock static quote");
    expect(result.stdout).toContain(
      "MOCK STATIC QUOTE - not real market data"
    );
    expect(result.stdout).toContain("source: mock/static data only");
  });

  it("renders interactive portfolio and quote cards", async () => {
    const result = await runStreetSpeakCli([], {
      interactiveInput: [
        "show my portfolio",
        "what is HOOD trading at",
        "exit"
      ],
      now: FIXED_NOW
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Portfolio Summary");
    expect(result.stdout).toContain("$12,500.00 mock buying power");
    expect(result.stdout).toContain("Quote Result");
    expect(result.stdout).toContain("HOOD mock static quote");
    expect(result.stdout).toContain("MOCK STATIC QUOTE - not real market data");
  });

  it("builds a buy 5 HOOD mock ticket with exact confirmation wording", async () => {
    const result = await runStreetSpeakCli(["demo", "buy 5 HOOD"], {
      now: FIXED_NOW,
      challengeCode: "4827"
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("status: awaiting_confirmation");
    expect(result.stdout).toContain(
      "Mock ticket only. No live broker order placed."
    );
    expect(result.stdout).toContain("ticket: BUY 5 HOOD MARKET DAY");
    expect(result.stdout).toContain("live trading enabled: false");
    expect(result.stdout).toContain("CONFIRM MOCK BUY 5 HOOD MARKET CODE 4827");
    expect(result.stdout).toContain("This is not investment advice.");
    expect(result.stdout).toContain(
      "Actual Robinhood trade approval happens outside StreetSpeak for now."
    );
  });

  it(
    "runs the interactive mock ticket, generic rejection, exact confirmation, " +
      "and receipt flow",
    async () => {
      const result = await runStreetSpeakCli([], {
        interactiveInput: [
          "buy 5 HOOD",
          "yes",
          "confirm CONFIRM MOCK BUY 5 HOOD MARKET CODE 4827",
          "receipt",
          "exit"
        ],
        now: FIXED_NOW,
        challengeCode: "4827"
      });

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Mock Ticket");
      expect(result.stdout).toContain("Symbol: HOOD");
      expect(result.stdout).toContain("Mode: mock");
      expect(result.stdout).toContain("Safety Review");
      expect(result.stdout).toContain("Live trading enabled: false");
      expect(result.stdout).toContain("Exact Confirmation Required");
      expect(result.stdout).toContain(
        "CONFIRM MOCK BUY 5 HOOD MARKET CODE 4827"
      );
      expect(result.stdout).toContain("Confirmation Rejected");
      expect(result.stdout).toContain("Reason: generic_confirmation");
      expect(result.stdout).toContain("Mock Submission Complete");
      expect(result.stdout).toContain("Receipt");
      expect(result.stdout).toContain("Mock Only / No Live Trading");
      expect(result.stdout).toContain("No live broker order was placed.");
    }
  );

  it("keeps interactive notional commands unsupported", async () => {
    const result = await runStreetSpeakCli([], {
      interactiveInput: ["buy $500 of HOOD", "exit"],
      now: FIXED_NOW
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Unsupported Command");
    expect(result.stdout).toContain("No final ticket created.");
    expect(result.stdout).toContain(
      "No dollar amount was converted into shares."
    );
    expect(result.stdout).not.toContain("Mock Submission Complete");
  });

  it("keeps unsupported notional commands blocked without a final ticket", async () => {
    const result = await runStreetSpeakCli(["demo", "buy $500 of HOOD"], {
      now: FIXED_NOW
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("status: unsupported");
    expect(result.stdout).toContain("No final ticket created.");
    expect(result.stdout).toContain("No live broker order was placed.");
    expect(result.stdout).toContain(
      "No dollar amount was converted into shares."
    );
    expect(result.stdout).not.toContain("Exact mock confirmation phrase/code");
  });

  it("builds a safe Robinhood Agent manual handoff prompt", async () => {
    const result = await runStreetSpeakCli([
      "robinhood",
      "handoff",
      "buy 5 HOOD"
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      "Ask your Robinhood Agent: Build or review a long equity order to buy 5 shares of HOOD."
    );
    expect(result.stdout).toContain(
      "Do not place the order unless I separately confirm inside the Robinhood Agent flow."
    );
    expect(result.stdout).toContain(
      "StreetSpeak did not send this to Robinhood, did not review the order, and did not place an order."
    );
    expect(result.stdout).toContain("This is not investment advice.");
  });

  it("renders interactive handoff and smoke status cards", async () => {
    const result = await runStreetSpeakCli([], {
      interactiveInput: ["buy 5 HOOD", "handoff", "smoke", "exit"],
      now: FIXED_NOW,
      challengeCode: "4827"
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Robinhood Agent Handoff");
    expect(result.stdout).toContain(
      "StreetSpeak did not send anything to Robinhood."
    );
    expect(result.stdout).toContain("StreetSpeak did not review the order.");
    expect(result.stdout).toContain("StreetSpeak did not place an order.");
    expect(result.stdout).toContain("Robinhood Smoke Status");
    expect(result.stdout).toContain("status: unavailable");
    expect(result.stdout).toContain("raw payload included: false");
  });

  it("renders interactive receipt empty state, bad commands, empty input, and exit", async () => {
    const result = await runStreetSpeakCli([], {
      interactiveInput: ["receipt", "", "dance", "exit"],
      now: FIXED_NOW
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No mock receipt is available yet.");
    expect(result.stdout).toContain("Empty command ignored.");
    expect(result.stdout).toContain("Unsupported Command");
    expect(result.stdout).toContain(
      "Type help for supported session commands."
    );
    expect(result.stdout).toContain("StreetSpeak session closed");
  });

  it("blocks options handoff as future unsupported work", () => {
    const handoff = buildRobinhoodAgentHandoff("buy 1 HOOD call");

    expect(handoff.supported).toBe(false);
    expect(handoff.message).toContain("Options handoff is unsupported/future");
  });

  it("keeps no-live-execution wording on mock order output", async () => {
    const result = await runStreetSpeakCli(["demo", "buy 5 HOOD"], {
      now: FIXED_NOW,
      challengeCode: "1234"
    });

    expect(result.stdout).toContain("No live broker order placed.");
    expect(result.stdout).toContain(
      "StreetSpeak CLI does not review, place, or cancel Robinhood orders."
    );
    expect(result.stdout).toContain("live trading enabled: false");
  });

  it("constructs the macOS say provider command without external services", async () => {
    const command = buildMacOsSayCommand("mock ticket only");
    const calls: Array<{ command: string; args: readonly string[] }> = [];
    const provider = createTextToSpeechProvider({
      platform: "darwin",
      async runCommand(commandName, args) {
        calls.push({ command: commandName, args });
      }
    });

    const result = await provider.speak("mock ticket only");

    expect(command).toEqual({
      command: "say",
      args: ["mock ticket only"]
    });
    expect(calls).toEqual([
      {
        command: "say",
        args: ["mock ticket only"]
      }
    ]);
    expect(result).toMatchObject({
      provider: "macos_say",
      rawAudioStoredByStreetSpeak: false,
      command: "say",
      args: ["mock ticket only"]
    });
  });

  it("uses stdout fallback for speak on non-macOS platforms", async () => {
    const result = await runStreetSpeakCli(["speak", "mock ticket only"], {
      platform: "linux"
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("mock ticket only");
    expect(result.stdout).toContain(
      "StreetSpeak TTS: stdout fallback used. No raw audio stored."
    );
  });

  it("toggles interactive speak-back without storing raw audio", async () => {
    const spoken: string[] = [];
    const provider: TextToSpeechProvider = {
      kind: "stdout_fallback",
      async speak(text) {
        spoken.push(text);

        return {
          provider: "stdout_fallback",
          text,
          rawAudioStoredByStreetSpeak: false
        };
      }
    };

    const result = await runStreetSpeakCli([], {
      interactiveInput: [
        "speak on",
        "status",
        "speak off",
        "status",
        "exit"
      ],
      textToSpeechProvider: provider
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Speak-back is on for future responses.");
    expect(result.stdout).toContain("Speak-back is off.");
    expect(result.stdout).toContain(
      "StreetSpeak TTS: stdout fallback used. No raw audio stored."
    );
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toContain("Mock trading desk: available");
  });

  it("clears the interactive terminal without persisting state to disk", async () => {
    const result = await runStreetSpeakCli([], {
      interactiveInput: ["clear", "exit"]
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("\u001Bc");
    expect(result.stdout).toContain("StreetSpeak AI");
    expect(result.stdout).toContain("No live trading");
  });

  it("supports --speak on demo commands through an injected safe provider", async () => {
    const spoken: string[] = [];
    const provider: TextToSpeechProvider = {
      kind: "stdout_fallback",
      async speak(text) {
        spoken.push(text);

        return {
          provider: "stdout_fallback",
          text,
          rawAudioStoredByStreetSpeak: false
        };
      }
    };

    const result = await runStreetSpeakCli(
      ["demo", "--speak", "show my portfolio"],
      {
        now: FIXED_NOW,
        textToSpeechProvider: provider
      }
    );

    expect(result.exitCode).toBe(0);
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toContain("$12,500.00 mock buying power");
    expect(result.stdout).toContain(
      "StreetSpeak TTS: stdout fallback used. No raw audio stored."
    );
  });

  it("reports Robinhood smoke as unavailable and redacted by default", async () => {
    const result = await runStreetSpeakCli(["robinhood", "smoke"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("get_accounts: unavailable/unconfigured");
    expect(result.stdout).toContain("status: unavailable");
    expect(result.stdout).toContain("raw payload included: false");
    expect(result.stdout).toContain("live execution available: false");
    expect(result.stdout).toContain("order review available: false");
    expect(result.stdout).toContain("order placement available: false");
    expect(result.stdout).toContain("cancel order available: false");
  });

  it("never prints raw MCP payload values during smoke checks", async () => {
    const client: RobinhoodMcpReadOnlyClient = {
      async callTool(toolName: RobinhoodMcpReadOnlyToolName) {
        switch (toolName) {
          case "get_accounts":
            return {
              accounts: [
                {
                  account_id: "acct-raw-123",
                  account_number: "RH-raw-456",
                  token: "secret-token"
                }
              ]
            };
          case "get_portfolio":
            return {
              portfolio: {
                buying_power: 9999,
                cash: 1234,
                positions: [{ symbol: "HOOD", market_value: 112.4 }]
              }
            };
          case "get_equity_positions":
            return {
              positions: [
                {
                  symbol: "HOOD",
                  quantity: 5,
                  market_value: 112.4
                }
              ]
            };
          case "get_equity_quotes":
            return {
              quotes: [
                {
                  symbol: "HOOD",
                  last_price: 22.48,
                  bid_price: 22.46,
                  ask_price: 22.5
                }
              ]
            };
          case "get_equity_orders":
            return {
              orders: [
                {
                  order_id: "order-raw-789",
                  price: 22.48
                }
              ]
            };
          case "get_equity_tradability":
            return {
              result: {
                symbol: "HOOD",
                tradable: true
              }
            };
          case "search":
            return {
              results: [{ symbol: "HOOD", name: "Robinhood Markets Inc." }]
            };
        }
      }
    };

    const result = await runStreetSpeakCli(["robinhood", "smoke"], {
      robinhoodMcpClient: client
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      "get_accounts: success, count=1, identifiers redacted"
    );
    expect(result.stdout).toContain("get_portfolio: success, values redacted");
    expect(result.stdout).toContain("status: available");
    expect(result.stdout).not.toContain("acct-raw-123");
    expect(result.stdout).not.toContain("RH-raw-456");
    expect(result.stdout).not.toContain("secret-token");
    expect(result.stdout).not.toContain("9999");
    expect(result.stdout).not.toContain("112.4");
    expect(result.stdout).not.toContain("22.48");
    expect(result.stdout).not.toContain("order-raw-789");
  });

  it("does not expose Robinhood order review, placement, or cancel commands", async () => {
    for (const args of [
      ["robinhood", "review", "buy 5 HOOD"],
      ["robinhood", "place", "buy 5 HOOD"],
      ["robinhood", "cancel", "order-1"]
    ]) {
      const result = await runStreetSpeakCli(args);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(
        "Available Robinhood CLI commands: smoke, handoff"
      );
      expect(result.stderr).toContain(
        "No order review, order placement, or cancel-order command exists."
      );
    }
  });
});
