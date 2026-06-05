# StreetSpeak AI Design Direction

StreetSpeak AI v0.1 should feel like a premium, medium-blue fintech and AI command surface while staying explicit about the mock-only trading boundary.

## Identity

- Product signal: StreetSpeak AI, a local voice-native trading desk for AI agents.
- Primary impression: high-trust, screenshot-ready, polished, technical, and safety-first.
- Tone: precise and self-directed. The UI should never imply investment advice, broker affiliation, live trading, automated execution, or trade recommendations.

## Palette

- Primary blue: `#2563FF`.
- Secondary blue: `#3B82F6`.
- Deep shadow blue: `#082A66`.
- Light panel surfaces: white and soft blue glass treatments for readability.
- Support accents: mint/green for safe mock mode, coral/red for hard no-live-trading boundaries, amber for warnings.

Avoid a dark navy-dominant app. The dominant feel should be energetic medium blue with depth, not a black trading terminal.

## Component Style

- App shell: medium-blue gradient background, crisp StreetSpeak AI brand lockup, top navigation, and persistent `Mock Only` / `No Live Trading` badges.
- Panels: layered light glass cards with 8px radius, thin blue borders, and premium lower-right shadows.
- Command center: one large central command card with typed fallback, browser-native voice status, example chips, transcript preview, and a listening treatment.
- Workflow: make the sequence clear: user command, parsed intent, ticket, safety review, exact confirmation, mock receipt.
- Robinhood areas: keep the mock desk, fixture explorer, and MCP read-only panel visually separate. Use explicit badges such as `Fixture Only`, `Read-Only`, `No Live Connection`, and `No Order Actions`.
- Motion: subtle hover, focus, and listening pulse only. Respect reduced-motion preferences.
- Accessibility: visible focus states, readable contrast, mobile usability, and no text overlap.

## Inspiration Sites

The following sites are visual inspiration only:

- `https://aibottlenecks.app/`
- `https://public.com/ai-agents?wpsrc=Organic+Search&wpsn=www.google.com`
- `https://robinhood.com/us/en/agentic-trading/`
- `https://robinhood.com/us/en/strategies/`

Do not copy logos, assets, exact layouts, brand identity, screenshots, copy, or proprietary visual systems from these references.

## Safety-First UI Principles

- Keep live trading unavailable and visually obvious.
- Do not render broker login, API key, token, MCP URL, order review, order placement, cancel-order, or live execution controls.
- Do not show real account data, real portfolio values, real holdings, real order IDs, raw MCP output, credentials, or secrets.
- Keep confirmation language precise: generic confirmations are rejected and the exact mock phrase/code is required.
- Keep exports local-only and redacted, with the receipt statement that no live broker order was placed.
- Do not add trade recommendation behavior or investment-advice language.
