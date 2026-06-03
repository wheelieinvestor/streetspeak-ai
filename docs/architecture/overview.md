# Architecture Overview

StreetSpeak AI is organized as a TypeScript pnpm monorepo.

- `apps/web`: future local dashboard.
- `packages/core`: shared types and command routing.
- `packages/orders`: order ticket schemas and validation.
- `packages/safety`: safety rules and confirmation gates.
- `packages/audit`: local audit event types and future storage interface.
- `packages/voice`: voice provider abstraction for browser speech, local STT, and future ElevenLabs support.
- `packages/brokers`: broker adapter interfaces plus mock adapter placeholder.

The first scaffold is mock-only. Robinhood MCP and Public adapters are planned but not implemented.
