# StreetSpeak CLI Quickstart

The StreetSpeak CLI is a local mock trading desk utility. It does not place trades, review Robinhood orders, cancel orders, store credentials, or print raw MCP output.

## Install And Build

```sh
pnpm install
pnpm build
```

For quick local development, run the TypeScript source directly through the dev wrapper:

```sh
pnpm streetspeak:dev status
pnpm streetspeak:dev demo "buy 5 HOOD"
pnpm streetspeak:dev robinhood handoff "buy 5 HOOD"
pnpm streetspeak:dev speak "StreetSpeak AI is ready."
```

The dev wrapper uses the minimal `tsx` dev dependency so Dean can run CLI commands without first generating `dist/` output.

For built usage, run the production path:

```sh
pnpm build
pnpm streetspeak status
```

After `pnpm build`, the CLI package also exposes a `streetspeak` bin from `apps/cli`.

StreetSpeak CLI does not place real trades. Robinhood Agent handoff is manual only.

## Status

```sh
pnpm streetspeak:dev status
# or, after pnpm build:
pnpm streetspeak status
```

Expected safety state:

- Mock trading desk: available.
- Robinhood fixture explorer: available in the web app.
- Robinhood MCP read-only boundary: unavailable/unconfigured by default.
- Live trading: unavailable.
- Order review: unavailable.
- Order placement: unavailable.
- Cancel order: unavailable.
- Credentials stored by StreetSpeak: false.
- Raw MCP output printed: false.

## Mock Demo Commands

```sh
pnpm streetspeak:dev demo "show my portfolio"
pnpm streetspeak:dev demo "what is HOOD trading at"
pnpm streetspeak:dev demo "buy 5 HOOD"
pnpm streetspeak:dev demo "buy $500 of HOOD"
```

Built path after `pnpm build`:

```sh
pnpm streetspeak demo "show my portfolio"
pnpm streetspeak demo "what is HOOD trading at"
pnpm streetspeak demo "buy 5 HOOD"
pnpm streetspeak demo "buy $500 of HOOD"
```

`buy 5 HOOD` builds a mock ticket only. It prints a safety review and an exact mock confirmation phrase/code, but no live broker order is placed. Actual Robinhood trade approval happens outside StreetSpeak for now.

`buy $500 of HOOD` remains unsupported and creates no final ticket. StreetSpeak does not convert notional amounts into shares.

## Text To Speech

```sh
pnpm streetspeak:dev speak "mock ticket only"
pnpm streetspeak:dev demo "show my portfolio" --speak
```

Built path after `pnpm build`:

```sh
pnpm streetspeak speak "mock ticket only"
pnpm streetspeak demo "show my portfolio" --speak
```

On macOS, the CLI uses the local `say` command. On other platforms, it falls back to stdout. StreetSpeak does not use ElevenLabs, API keys, external TTS services, or raw audio storage.

## Robinhood Read-Only Smoke

```sh
pnpm streetspeak:dev robinhood smoke
# or, after pnpm build:
pnpm streetspeak robinhood smoke
```

The default result is unavailable/unconfigured. If an external MCP client is provided at runtime, the CLI prints only redacted summary lines. Never paste credentials, tokens, account IDs, MCP URLs, auth config, or raw MCP output into CLI commands, docs, screenshots, PRs, or handoffs.

## Robinhood Agent Handoff

```sh
pnpm streetspeak:dev robinhood handoff "buy 5 HOOD"
# or, after pnpm build:
pnpm streetspeak robinhood handoff "buy 5 HOOD"
```

The CLI prints a manual prompt for Dean's connected Robinhood Agent. StreetSpeak does not send the prompt to Robinhood, does not review the order, and does not place an order. Any quote lookup, cost estimate, buying-power impact, warning review, and trade approval must happen inside the separate Robinhood Agent flow.

Options handoff is unsupported/future. Live trading, order review, order placement, cancel order, autonomous trading, broker login UI, analytics, payments, Discord/X automation, and trade recommendations are not CLI features.

## Voice Input

Typed CLI input is primary. The CLI can accept pasted transcripts from any local dictation tool. Browser-native voice remains in the web app. Future local Whisper or `whisper.cpp` support can be evaluated later, but this CLI adds no speech-to-text dependency, model, or external voice service.
