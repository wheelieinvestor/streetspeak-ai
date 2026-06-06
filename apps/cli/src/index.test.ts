import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
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
    expect(result.stdout).toContain("Voice-native trading desk for AI agents");
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
    expect(result.stdout).toContain(
      "Generic confirmations like yes are rejected."
    );
    expect(result.stdout).toContain("manual Robinhood Agent prompt");
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
    expect(result.stdout).toContain("MOCK STATIC QUOTE - not real market data");
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
      "Mock ticket only. No live broker order was placed."
    );
    expect(result.stdout).toContain("ticket: BUY 5 HOOD MARKET DAY");
    expect(result.stdout).toContain("live trading enabled: false");
    expect(result.stdout).toContain("CONFIRM MOCK BUY 5 HOOD MARKET CODE 4827");
    expect(result.stdout).toContain("This is not investment advice.");
    expect(result.stdout).toContain(
      "Actual Robinhood trade approval happens outside StreetSpeak for now."
    );
  });

  it("routes one-off text transcripts through the mock-only voice command path", async () => {
    const result = await runStreetSpeakCli(["transcript", "buy 5 HOOD"], {
      now: FIXED_NOW,
      challengeCode: "4827"
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Voice Transcript Bridge");
    expect(result.stdout).toContain("Input source: text transcript.");
    expect(result.stdout).toContain("Command source: voice.");
    expect(result.stdout).toContain("Mock Ticket");
    expect(result.stdout).toContain("Symbol: HOOD");
    expect(result.stdout).toContain("Exact Confirmation Required");
    expect(result.stdout).toContain("CONFIRM MOCK BUY 5 HOOD MARKET CODE 4827");
    expect(result.stdout).toContain(
      "Generic confirmations like yes, do it, or confirmed are rejected."
    );
    expect(result.stdout).toContain(
      "StreetSpeak stores no transcript copy and no raw audio."
    );
    expect(result.stdout).toContain("No live broker order was placed.");
  });

  it("supports --speak on one-off transcript commands without raw audio storage", async () => {
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
      ["transcript", "--speak", "show my portfolio"],
      {
        now: FIXED_NOW,
        textToSpeechProvider: provider
      }
    );

    expect(result.exitCode).toBe(0);
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toBe(
      "Mock portfolio summary is ready. Source is mock static data only. No live broker order was placed."
    );
    expect(result.stdout).toContain(
      "StreetSpeak TTS: stdout fallback used. No raw audio stored."
    );
  });

  it("feeds transcript files into the same mock-only interactive session path", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "streetspeak-cli-"));
    const transcriptPath = path.join(directory, "transcript.txt");

    try {
      await writeFile(
        transcriptPath,
        [
          "buy 5 HOOD",
          "yes",
          "confirm CONFIRM MOCK BUY 5 HOOD MARKET CODE 4827",
          "receipt"
        ].join("\n"),
        "utf8"
      );

      const result = await runStreetSpeakCli(
        ["session", "--transcript-file", transcriptPath],
        {
          now: FIXED_NOW,
          challengeCode: "4827"
        }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Transcript File Bridge");
      expect(result.stdout).toContain("Loaded 4 text transcript lines.");
      expect(result.stdout).toContain(
        "Every line routes through the same mock-only session command handler."
      );
      expect(result.stdout).toContain("Confirmation Rejected");
      expect(result.stdout).toContain("Reason: generic_confirmation");
      expect(result.stdout).toContain("Mock Submission Complete");
      expect(result.stdout).toContain("Receipt");
      expect(result.stdout).toContain("Copy/paste safe receipt");
      expect(result.stdout).toContain("Raw audio stored: false");
      expect(result.stdout).toContain("No live broker order was placed.");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("fails closed when transcript file input is missing or unreadable", async () => {
    const missingPath = path.join(
      tmpdir(),
      "streetspeak-missing-transcript.txt"
    );

    const missingArg = await runStreetSpeakCli([
      "session",
      "--transcript-file"
    ]);
    const unreadable = await runStreetSpeakCli([
      "session",
      "--transcript-file",
      missingPath
    ]);
    const wrongCommand = await runStreetSpeakCli([
      "transcript",
      "--transcript-file",
      missingPath,
      "buy 5 HOOD"
    ]);

    expect(missingArg.exitCode).toBe(1);
    expect(missingArg.stderr).toContain(
      "Provide a transcript file path after --transcript-file"
    );
    expect(unreadable.exitCode).toBe(1);
    expect(unreadable.stderr).toContain("Unable to read transcript file");
    expect(wrongCommand.exitCode).toBe(1);
    expect(wrongCommand.stderr).toContain(
      "Use --transcript-file with the session command only"
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
      expect(result.stdout).toContain("Copy/paste safe receipt");
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
    expect(result.stdout).toContain("Robinhood Agent Manual Handoff");
    expect(result.stdout).toContain("Copy/paste prompt:");
    expect(result.stdout).toContain(
      "Build or review a long equity order to buy 5 shares of HOOD."
    );
    expect(result.stdout).toContain(
      "Do not place the order unless I separately confirm inside the Robinhood Agent flow."
    );
    expect(result.stdout).toContain(
      "StreetSpeak did not send this to Robinhood, did not review the order, and did not place an order."
    );
    expect(result.stdout).toContain(
      "StreetSpeak CLI has no Robinhood order review, order placement, cancel order, or live execution command."
    );
    expect(result.stdout).toContain("No live broker order was placed.");
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
    expect(result.stdout).toContain(
      "Do not place anything unless separately confirmed inside Robinhood Agent."
    );
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

  it("keeps options handoff unsupported through the CLI command", async () => {
    const result = await runStreetSpeakCli([
      "robinhood",
      "handoff",
      "buy 1 HOOD call"
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Options handoff is unsupported/future");
    expect(result.stdout).toContain("No live broker order was placed.");
    expect(result.stdout).toContain(
      "No Robinhood order review, order placement, cancel order, or live execution command exists"
    );
  });

  it("keeps no-live-execution wording on mock order output", async () => {
    const result = await runStreetSpeakCli(["demo", "buy 5 HOOD"], {
      now: FIXED_NOW,
      challengeCode: "1234"
    });

    expect(result.stdout).toContain("No live broker order was placed.");
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

  it("passes macOS voice flags and env fallback to say", async () => {
    const flagCalls: Array<{ command: string; args: readonly string[] }> = [];
    const envCalls: Array<{ command: string; args: readonly string[] }> = [];

    const flagResult = await runStreetSpeakCli(
      ["speak", "StreetSpeak AI is ready.", "--voice", "Samantha"],
      {
        platform: "darwin",
        async runCommand(commandName, args) {
          flagCalls.push({ command: commandName, args });
        }
      }
    );
    const envProvider = createTextToSpeechProvider({
      platform: "darwin",
      env: {
        STREETSPEAK_MACOS_VOICE: "Samantha"
      },
      async runCommand(commandName, args) {
        envCalls.push({ command: commandName, args });
      }
    });
    const envResult = await envProvider.speak("StreetSpeak AI is ready.");

    expect(
      buildMacOsSayCommand("StreetSpeak AI is ready.", "Samantha")
    ).toEqual({
      command: "say",
      args: ["-v", "Samantha", "StreetSpeak AI is ready."]
    });
    expect(flagResult.exitCode).toBe(0);
    expect(flagCalls).toEqual([
      {
        command: "say",
        args: ["-v", "Samantha", "StreetSpeak AI is ready."]
      }
    ]);
    expect(envCalls).toEqual([
      {
        command: "say",
        args: ["-v", "Samantha", "StreetSpeak AI is ready."]
      }
    ]);
    expect(envResult).toMatchObject({
      provider: "macos_say",
      voice: "Samantha"
    });
  });

  it("falls back safely when ElevenLabs API key is missing", async () => {
    const result = await runStreetSpeakCli(
      ["speak", "StreetSpeak AI is ready.", "--provider", "elevenlabs"],
      {
        platform: "linux",
        env: {
          ELEVENLABS_VOICE_ID: "voice-id"
        }
      }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("StreetSpeak AI is ready.");
    expect(result.stdout).toContain(
      "StreetSpeak TTS: ElevenLabs unavailable (missing ELEVENLABS_API_KEY); stdout fallback used. No raw audio stored."
    );
  });

  it("falls back safely when ElevenLabs voice ID is missing without printing the API key", async () => {
    const apiKey = "test-elevenlabs-secret-key";
    const result = await runStreetSpeakCli(
      ["speak", "StreetSpeak AI is ready.", "--provider", "elevenlabs"],
      {
        platform: "linux",
        env: {
          ELEVENLABS_API_KEY: apiKey
        }
      }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(
      "StreetSpeak TTS: ElevenLabs unavailable (missing ELEVENLABS_VOICE_ID); stdout fallback used. No raw audio stored."
    );
    expect(result.stdout).not.toContain(apiKey);
    expect(result.stderr).not.toContain(apiKey);
  });

  it("constructs ElevenLabs requests with mocked fetch and never prints the key", async () => {
    const apiKey = "test-elevenlabs-secret-key";
    const fetchCalls: Array<{ input: RequestInfo | URL; init?: RequestInit }> =
      [];
    const playbackCalls: Array<{ command: string; args: readonly string[] }> =
      [];
    const fakeFetch: typeof fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      fetchCalls.push({ input, init });

      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    };

    const result = await runStreetSpeakCli(
      ["speak", "StreetSpeak AI is ready.", "--provider", "elevenlabs"],
      {
        platform: "darwin",
        env: {
          ELEVENLABS_API_KEY: apiKey,
          ELEVENLABS_VOICE_ID: "voice-123",
          ELEVENLABS_MODEL_ID: "eleven-test-model"
        },
        fetch: fakeFetch,
        async runCommand(commandName, args) {
          playbackCalls.push({ command: commandName, args });
        }
      }
    );
    const request = fetchCalls[0];

    if (!request) {
      throw new Error("expected ElevenLabs fetch call");
    }

    const headers = request.init?.headers as Record<string, string>;
    const body = JSON.parse(String(request.init?.body ?? "{}")) as {
      readonly text?: string;
      readonly model_id?: string;
    };

    expect(result.exitCode).toBe(0);
    expect(String(request.input)).toBe(
      "https://api.elevenlabs.io/v1/text-to-speech/voice-123"
    );
    expect(request.init?.method).toBe("POST");
    expect(headers["xi-api-key"]).toBe(apiKey);
    expect(headers["Content-Type"]).toBe("application/json");
    expect(body).toEqual({
      text: "StreetSpeak AI is ready.",
      model_id: "eleven-test-model"
    });
    expect(playbackCalls).toHaveLength(1);
    expect(playbackCalls[0]?.command).toBe("afplay");
    expect(result.stdout).toContain(
      "StreetSpeak TTS: ElevenLabs provider used for local playback. Temporary audio deleted. No raw audio stored."
    );
    expect(result.stdout).not.toContain(apiKey);
    expect(result.stderr).not.toContain(apiKey);
  });

  it("uses env provider selection for session speak and reports missing ElevenLabs setup", async () => {
    const result = await runStreetSpeakCli(["session", "--speak"], {
      platform: "linux",
      env: {
        STREETSPEAK_TTS_PROVIDER: "elevenlabs"
      },
      interactiveInput: ["status", "exit"]
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Provider preference: ElevenLabs.");
    expect(result.stdout).toContain(
      "ElevenLabs setup incomplete: missing ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID."
    );
    expect(result.stdout).toContain(
      "StreetSpeak TTS: ElevenLabs unavailable (missing ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID); stdout fallback used. No raw audio stored."
    );
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
      interactiveInput: ["speak on", "status", "speak off", "status", "exit"],
      textToSpeechProvider: provider
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Speak-back is on for future responses.");
    expect(result.stdout).toContain("Speak-back is off.");
    expect(result.stdout).toContain(
      "StreetSpeak TTS: stdout fallback used. No raw audio stored."
    );
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toBe(
      "StreetSpeak status is ready. Live trading, order review, order placement, and cancel order remain unavailable."
    );
  });

  it("starts session --speak with speak-back enabled for the session only", async () => {
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

    const result = await runStreetSpeakCli(["session", "--speak"], {
      interactiveInput: ["status", "speak off", "status", "exit"],
      textToSpeechProvider: provider
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Speak-back is on for this session.");
    expect(result.stdout).toContain("Provider preference: stdout fallback.");
    expect(result.stdout).toContain("Speak-back is off.");
    expect(result.stdout).toContain(
      "Preferences are per-session only; no config file was written."
    );
    expect(result.stdout).toContain(
      "StreetSpeak TTS: stdout fallback used. No raw audio stored."
    );
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toBe(
      "StreetSpeak status is ready. Live trading, order review, order placement, and cancel order remain unavailable."
    );
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
    expect(spoken[0]).toBe(
      "Mock portfolio summary is ready. Source is mock static data only. No live broker order was placed."
    );
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

  it("does not speak raw MCP payload values during session smoke speak-back", async () => {
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
    const client: RobinhoodMcpReadOnlyClient = {
      async callTool(toolName: RobinhoodMcpReadOnlyToolName) {
        switch (toolName) {
          case "get_accounts":
            return {
              accounts: [
                {
                  account_id: "acct-raw-123",
                  token: "secret-token"
                }
              ]
            };
          case "get_portfolio":
            return {
              portfolio: {
                buying_power: 9999,
                positions: [{ symbol: "HOOD", market_value: 112.4 }]
              }
            };
          case "get_equity_positions":
            return {
              positions: [{ symbol: "HOOD", quantity: 5 }]
            };
          case "get_equity_quotes":
            return {
              quotes: [{ symbol: "HOOD", last_price: 22.48 }]
            };
          case "get_equity_orders":
            return {
              orders: [{ order_id: "order-raw-789" }]
            };
          case "get_equity_tradability":
            return {
              result: { symbol: "HOOD", tradable: true }
            };
          case "search":
            return {
              results: [{ symbol: "HOOD" }]
            };
        }
      }
    };

    const result = await runStreetSpeakCli(["session", "--speak"], {
      interactiveInput: ["smoke", "exit"],
      robinhoodMcpClient: client,
      textToSpeechProvider: provider
    });

    expect(result.exitCode).toBe(0);
    expect(spoken).toHaveLength(1);
    expect(spoken[0]).toBe(
      "Robinhood read-only smoke status is ready. Raw MCP output was not spoken."
    );
    expect(spoken[0]).not.toContain("acct-raw-123");
    expect(spoken[0]).not.toContain("secret-token");
    expect(spoken[0]).not.toContain("9999");
    expect(spoken[0]).not.toContain("112.4");
    expect(spoken[0]).not.toContain("22.48");
    expect(spoken[0]).not.toContain("order-raw-789");
  });

  it("speaks only a safe summary for interactive handoff output", async () => {
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

    const result = await runStreetSpeakCli(["session", "--speak"], {
      interactiveInput: ["buy 5 HOOD", "handoff", "exit"],
      challengeCode: "4827",
      textToSpeechProvider: provider
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Build or review a long equity order");
    expect(spoken).toHaveLength(2);
    expect(spoken[0]).toBe(
      "Mock ticket created. Exact confirmation is required before mock submission. No live broker order was placed."
    );
    expect(spoken[1]).toBe(
      "Handoff prompt is ready. StreetSpeak did not send, review, place, or cancel an order."
    );
    expect(spoken[1]).not.toContain("Build or review");
    expect(spoken[1]).not.toContain("buy 5 shares of HOOD");
  });

  it("does not expose top-level live trading commands", async () => {
    for (const args of [
      ["trade", "buy 5 HOOD"],
      ["place", "buy 5 HOOD"],
      ["cancel", "order-1"]
    ]) {
      const result = await runStreetSpeakCli(args);

      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain(`Unknown command: ${args[0]}`);
      expect(result.stderr).toContain(
        "No live trading, order review, order placement, or cancel-order command exists in this CLI."
      );
    }
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
