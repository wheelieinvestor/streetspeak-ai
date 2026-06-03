# Contributing

StreetSpeak AI is intended to become a public open-source repository. Contributions should keep the project simple, inspectable, and safe by default.

Before finishing a change, run:

```sh
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

Contribution rules:

- Keep mock mode working.
- Do not add live trading unless the task explicitly asks for it.
- Do not add broker credentials, API keys, tokens, or plaintext secrets.
- Do not add systems that recommend trades.
- Add focused tests for order ticket, confirmation, safety, and audit behavior.
- Keep user-facing wording clear that StreetSpeak AI is not investment advice.
