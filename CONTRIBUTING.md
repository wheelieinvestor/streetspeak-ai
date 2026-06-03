# Contributing

StreetSpeak AI is intended to become a public open-source repository. Contributions should keep the project simple, inspectable, and safe by default.

## Collaboration Workflow

`main` is the stable branch. Never push directly to `main`.

Create a branch for every change:

- `feature/short-description`
- `fix/short-description`
- `docs/short-description`
- `agent/short-description`

Keep branches small and focused. Open a pull request for every code or documentation change, wait for review and CI before merging, use squash merge, and delete the branch after merge.

Pull latest `main` before starting new work:

```sh
git checkout main
git pull origin main
git checkout -b feature/example-change
```

Commit and push your branch:

```sh
git add .
git commit -m "Describe change"
git push origin feature/example-change
```

Before finishing a change, run:

```sh
pnpm build
pnpm test
pnpm lint
pnpm typecheck
```

## Pull Request Rules

- Open a pull request for every change.
- Request review from the other collaborator.
- Wait for at least one approval before merging.
- Wait for CI to pass before merging.
- Resolve review conversations before merging.
- Use squash merge.
- Delete the branch after merge.

## Secret Handling

Never commit `.env` files, API keys, tokens, private keys, broker credentials, voice-provider credentials, or any other secrets.

Use `.env.example` for placeholder variable names only. If a secret is accidentally committed, rotate it immediately and remove it from git history before making the repository public.

## Project Safety Rules

- Keep mock mode working.
- Do not add live trading unless the task explicitly asks for it.
- Do not add broker credentials, API keys, tokens, or plaintext secrets.
- Do not add systems that recommend trades.
- Add focused tests for order ticket, confirmation, safety, and audit behavior.
- Keep user-facing wording clear that StreetSpeak AI is not investment advice.
