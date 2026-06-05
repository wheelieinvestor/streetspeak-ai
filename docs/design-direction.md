# StreetSpeak AI Design Direction

StreetSpeak AI v0.1 should feel like a premium, dark-blue fintech and AI command surface while staying explicit about the mock-only trading boundary.

## Identity

- Product signal: StreetSpeak AI, a local voice-native trading desk for AI agents.
- Primary impression: high-trust, screenshot-ready, polished, technical, and safety-first.
- Tone: precise and self-directed. The UI should never imply investment advice, broker affiliation, live trading, automated execution, or trade recommendations.

## Palette

- Primary blue: deep electric/royal blue, anchored by `#174DFF` and richer dark-blue gradients.
- Secondary blue: `#2F73FF` / soft electric blue glows.
- Deep shadow blue: `#071B4D` and darker layered navy-blue surfaces.
- Panel surfaces: dark glass treatments with subtle blue borders, large radii, layered shadows, and soft glows.
- Support accents: mint/green for safe mock mode, coral/red for hard no-live-trading boundaries, amber for warnings.

Avoid a flat black terminal or plain navy dashboard. The dominant feel should be rich dark blue with depth, motion, and cinematic polish.

## Component Style

- App shell: rich dark-blue gradient environment, crisp StreetSpeak AI brand lockup, top navigation, and persistent `Mock Only` / `No Live Trading` badges.
- Panels: layered dark glass cards with large radii, thin blue borders, soft blue glows, and premium lower-right shadows.
- Command center: the visual centerpiece, with a large glowing AI command bar, browser-native voice status, premium example chips, transcript preview, and a listening pulse/glow treatment.
- Workflow: make the sequence clear with a numbered rail and active states: user command, parsed intent, ticket, safety review, exact confirmation, mock receipt.
- Robinhood areas: keep the mock desk, fixture explorer, and MCP read-only panel visually separate as premium capability cards. Use explicit badges such as `Fixture Only`, `Read-Only`, `No Live Connection`, and `No Order Actions`.
- Motion: subtle background glow drift, section reveal, card hover lift, focus glow, modal fade/scale, status-dot pulse, confirmation attention pulse, and listening pulse. Respect reduced-motion preferences.
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
