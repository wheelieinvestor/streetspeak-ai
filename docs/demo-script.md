# StreetSpeak AI Mock Demo Script

This is a 2-minute walkthrough for the local mock-only StreetSpeak AI demo. It does not connect to Robinhood, Public, ElevenLabs, a broker, a speech API, or real market data.

## Setup

```sh
pnpm install
pnpm --filter @streetspeak-ai/web dev
```

Open the local Vite URL shown in the terminal.

## Walkthrough

1. Accept the first-run safety onboarding.
   - Confirm the app says StreetSpeak AI is not investment advice.
   - Confirm the app says the current version is mock-only.
   - Confirm no live broker order will be placed.

2. Run `show my portfolio`.
   - The app shows the static mock portfolio and local answer output.

3. Run `what is HOOD trading at`.
   - The app shows a static mock quote. This is not real market data.

4. Run `buy 5 HOOD`.
   - Review the parsed intent, mock order ticket, safety review, and exact confirmation challenge.

5. Try `yes` in the confirmation input.
   - The app rejects the generic confirmation and does not submit the mock order.

6. Enter the exact confirmation phrase and code shown by the app.
   - The app records a mock submission only.
   - The mock broker response says no live broker order was placed.
   - The audit timeline includes command, routing, ticket, safety, confirmation, and mock execution events.

7. Run `buy $500 of HOOD`.
   - The app returns unsupported notional handling.
   - No final ticket is created and no dollar amount is converted into shares.

## Optional Browser Voice

Use the local settings panel to enable or disable browser voice input. When supported by the browser, voice transcripts flow into the same parser as typed commands. StreetSpeak AI does not store raw audio, upload raw audio to a StreetSpeak server, or use ElevenLabs.
