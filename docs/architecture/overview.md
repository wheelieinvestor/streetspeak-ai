# Architecture Overview

StreetSpeak AI is organized as a TypeScript pnpm monorepo.

- `apps/web`: future local dashboard.
- `packages/core`: shared session, command, routing, and parsed-intent contracts.
- `packages/orders`: equity order ticket lifecycle types, validation, and creation helpers.
- `packages/safety`: safety reviews, explicit confirmation challenges, and generic-confirmation rejection.
- `packages/audit`: audit event types, redaction helpers, and future storage interface.
- `packages/voice`: voice transcript and provider abstraction for browser speech, local STT, and future ElevenLabs support.
- `packages/brokers`: mock-only broker adapter interfaces plus a mock adapter.

The first scaffold is mock-only. Robinhood MCP and Public adapters are planned but not implemented. There is no live broker execution method in the current broker interface.
