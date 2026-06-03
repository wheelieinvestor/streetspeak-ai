import {
  createMockSession,
  createMockTradingDeskTurn,
  submitMockTradingDeskConfirmation,
  type MockTradingDeskState
} from "@streetspeak-ai/core";
import "./styles.css";

const session = createMockSession();
const app = document.querySelector<HTMLElement>("#app");

if (app) {
  let currentState: MockTradingDeskState | null = null;
  let busy = false;

  const render = (): void => {
    app.innerHTML = createMarkup(currentState, busy);
    bindEvents();
  };

  const runCommand = async (command: string): Promise<void> => {
    busy = true;
    render();

    currentState = await createMockTradingDeskTurn(command, {
      session,
      source: "keyboard"
    });
    busy = false;
    render();
  };

  const submitConfirmation = async (
    confirmationText: string
  ): Promise<void> => {
    if (!currentState) {
      return;
    }

    busy = true;
    render();
    currentState = await submitMockTradingDeskConfirmation(
      currentState,
      confirmationText
    );
    busy = false;
    render();
  };

  const bindEvents = (): void => {
    const commandForm = app.querySelector<HTMLFormElement>("#command-form");
    const commandInput = app.querySelector<HTMLInputElement>("#command-input");
    const confirmationForm =
      app.querySelector<HTMLFormElement>("#confirmation-form");
    const confirmationInput = app.querySelector<HTMLInputElement>(
      "#confirmation-input"
    );
    const exampleButtons =
      app.querySelectorAll<HTMLButtonElement>("[data-command]");

    commandForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const command = commandInput?.value.trim() ?? "";

      if (command) {
        void runCommand(command);
      }
    });

    confirmationForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const confirmationText = confirmationInput?.value.trim() ?? "";

      if (confirmationText) {
        void submitConfirmation(confirmationText);
      }
    });

    for (const button of exampleButtons) {
      button.addEventListener("click", () => {
        const command = button.dataset.command;

        if (command && commandInput) {
          commandInput.value = command;
          void runCommand(command);
        }
      });
    }
  };

  render();
  void runCommand("show my portfolio");
}

function createMarkup(
  state: MockTradingDeskState | null,
  busy: boolean
): string {
  const confirmationDisabled =
    busy || !state?.challenge || state.status === "mock_submitted";

  return `
    <main class="desk-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">StreetSpeak AI</p>
          <h1>Mock Trading Desk</h1>
        </div>
        <div class="mode-stack" aria-label="mode status">
          <span class="badge">Mock mode</span>
          <span class="badge badge-danger">Live trading unavailable</span>
        </div>
      </header>

      <section class="warning-band">
        <strong>No live broker execution.</strong>
        This local demo uses static mock quotes, a fake portfolio, exact confirmation challenges, and an in-memory audit timeline. It is not investment advice.
      </section>

      <section class="command-band" aria-label="mock command input">
        <form id="command-form" class="command-form">
          <label for="command-input">Typed command</label>
          <div class="command-row">
            <input
              id="command-input"
              name="command"
              type="text"
              autocomplete="off"
              placeholder="buy 5 HOOD"
              ${busy ? "disabled" : ""}
            />
            <button type="submit" ${busy ? "disabled" : ""}>Run</button>
          </div>
        </form>
        <div class="examples" aria-label="example commands">
          ${renderExampleButton("buy 5 HOOD")}
          ${renderExampleButton("build a limit order to buy 3 AAPL at 175")}
          ${renderExampleButton("show me a quote for NVDA")}
          ${renderExampleButton("buy $500 of HOOD")}
        </div>
        <p class="voice-placeholder">
          Browser voice input is coming next. This demo does not send audio to a server and does not store raw audio.
        </p>
      </section>

      <section class="desk-grid">
        <section class="panel panel-span" aria-label="mock response">
          <div class="panel-heading">
            <h2>Response</h2>
            ${state ? `<span class="status-pill">${escapeHtml(state.status)}</span>` : ""}
          </div>
          <p class="answer">${escapeHtml(state?.answer ?? state?.message ?? "Run a mock command to begin.")}</p>
        </section>

        <section class="panel" aria-label="mock portfolio">
          <div class="panel-heading">
            <h2>Mock Portfolio</h2>
            <span class="muted">static</span>
          </div>
          ${renderPortfolio(state)}
        </section>

        <section class="panel" aria-label="parsed command">
          <div class="panel-heading">
            <h2>Parsed Command</h2>
            <span class="muted">${escapeHtml(state?.route.intent ?? "none")}</span>
          </div>
          ${renderParsedCommand(state)}
        </section>

        <section class="panel" aria-label="order ticket">
          <div class="panel-heading">
            <h2>Order Ticket</h2>
            <span class="muted">mock equity</span>
          </div>
          ${renderTicket(state)}
        </section>

        <section class="panel" aria-label="safety review">
          <div class="panel-heading">
            <h2>Safety Review</h2>
            <span class="muted">required</span>
          </div>
          ${renderSafety(state)}
        </section>

        <section class="panel panel-span" aria-label="confirmation">
          <div class="panel-heading">
            <h2>Confirmation Challenge</h2>
            <span class="muted">exact phrase required</span>
          </div>
          ${renderConfirmation(state, confirmationDisabled, busy)}
        </section>

        <section class="panel" aria-label="mock broker response">
          <div class="panel-heading">
            <h2>Mock Broker Response</h2>
            <span class="muted">no live order</span>
          </div>
          ${renderBrokerResponse(state)}
        </section>

        <section class="panel" aria-label="audit timeline">
          <div class="panel-heading">
            <h2>Audit Timeline</h2>
            <span class="muted">in memory</span>
          </div>
          ${renderAuditTimeline(state)}
        </section>
      </section>
    </main>
  `;
}

function renderExampleButton(command: string): string {
  return `<button type="button" class="example-button" data-command="${escapeHtml(
    command
  )}">${escapeHtml(command)}</button>`;
}

function renderPortfolio(state: MockTradingDeskState | null): string {
  const portfolio = state?.portfolio;

  if (!portfolio) {
    return `<p class="empty">Ask "show my portfolio" to load the local mock portfolio.</p>`;
  }

  return `
    <dl class="metric-list">
      <div><dt>Cash</dt><dd>${formatCurrency(portfolio.cash)}</dd></div>
      <div><dt>Buying power</dt><dd>${formatCurrency(portfolio.buyingPower)}</dd></div>
      <div><dt>Source</dt><dd>${escapeHtml(portfolio.source)}</dd></div>
    </dl>
    <ul class="position-list">
      ${portfolio.positions
        .map(
          (position) => `
            <li>
              <strong>${escapeHtml(position.symbol)}</strong>
              <span>${position.quantity} shares</span>
              <span>${formatCurrency(position.mockMarketValue)}</span>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderParsedCommand(state: MockTradingDeskState | null): string {
  if (!state) {
    return `<p class="empty">No command parsed yet.</p>`;
  }

  if (state.parse.kind === "order_ticket") {
    return `
      <dl class="detail-list">
        <div><dt>Kind</dt><dd>order ticket</dd></div>
        <div><dt>Summary</dt><dd>${escapeHtml(state.parse.summary)}</dd></div>
        <div><dt>Mode</dt><dd>mock only</dd></div>
      </dl>
    `;
  }

  if (state.parse.kind === "portfolio_question") {
    return `<p>${escapeHtml(state.parse.summary)}</p>`;
  }

  if (state.parse.kind === "quote_question") {
    return `<p>${escapeHtml(state.parse.summary)}</p>`;
  }

  return `<p class="rejected">${escapeHtml(state.parse.message)}</p>`;
}

function renderTicket(state: MockTradingDeskState | null): string {
  const ticket = state?.ticket;

  if (!ticket) {
    return `<p class="empty">No mock order ticket for this command.</p>`;
  }

  return `
    <dl class="detail-list">
      <div><dt>Side</dt><dd>${escapeHtml(ticket.side.toUpperCase())}</dd></div>
      <div><dt>Symbol</dt><dd>${escapeHtml(ticket.symbol)}</dd></div>
      <div><dt>Quantity</dt><dd>${ticket.quantity}</dd></div>
      <div><dt>Type</dt><dd>${escapeHtml(ticket.type)}</dd></div>
      ${
        ticket.limitPrice === undefined
          ? ""
          : `<div><dt>Limit</dt><dd>${formatCurrency(ticket.limitPrice)}</dd></div>`
      }
      <div><dt>State</dt><dd>${escapeHtml(ticket.lifecycleState)}</dd></div>
    </dl>
  `;
}

function renderSafety(state: MockTradingDeskState | null): string {
  const review = state?.safetyReview;

  if (!review) {
    return `<p class="empty">Order tickets require safety review before confirmation.</p>`;
  }

  return `
    <dl class="detail-list">
      <div><dt>Live trading</dt><dd>${String(review.liveTradingEnabled)}</dd></div>
      <div><dt>Exact confirmation</dt><dd>${String(review.requiresExplicitConfirmation)}</dd></div>
    </dl>
    ${renderList("Warnings", review.warnings, "warning-list")}
    ${renderList("Blocks", review.blocks, "block-list")}
  `;
}

function renderConfirmation(
  state: MockTradingDeskState | null,
  disabled: boolean,
  busy: boolean
): string {
  const challenge = state?.challenge;

  if (!challenge) {
    return `<p class="empty">No confirmation challenge is open.</p>`;
  }

  return `
    <p class="challenge-phrase">${escapeHtml(challenge.requiredPhrase)}</p>
    <form id="confirmation-form" class="confirmation-form">
      <label for="confirmation-input">Confirmation input</label>
      <div class="command-row">
        <input
          id="confirmation-input"
          name="confirmation"
          type="text"
          autocomplete="off"
          placeholder="CONFIRM MOCK ..."
          ${disabled ? "disabled" : ""}
        />
        <button type="submit" ${disabled ? "disabled" : ""}>Submit Mock</button>
      </div>
    </form>
    ${
      state?.confirmation && !state.confirmation.accepted
        ? `<p class="rejected">Rejected: ${escapeHtml(state.confirmation.reason)}</p>`
        : ""
    }
    ${busy ? `<p class="muted">Processing...</p>` : ""}
  `;
}

function renderBrokerResponse(state: MockTradingDeskState | null): string {
  const response = state?.brokerResponse;

  if (!response) {
    return `<p class="empty">Mock broker response appears only after exact confirmation.</p>`;
  }

  return `
    <dl class="detail-list">
      <div><dt>Status</dt><dd>${escapeHtml(response.status)}</dd></div>
      <div><dt>Mock order</dt><dd>${escapeHtml(response.id)}</dd></div>
      <div><dt>Submitted</dt><dd>${escapeHtml(formatDate(response.submittedAt))}</dd></div>
    </dl>
    <p class="accepted">${escapeHtml(response.message)}</p>
  `;
}

function renderAuditTimeline(state: MockTradingDeskState | null): string {
  const events = state?.auditTimeline ?? [];

  if (events.length === 0) {
    return `<p class="empty">No local audit events yet.</p>`;
  }

  return `
    <ol class="audit-list">
      ${events
        .map(
          (event) => `
            <li>
              <span>${escapeHtml(event.type)}</span>
              <small>${escapeHtml(event.actor)} • ${escapeHtml(
                formatDate(event.occurredAt)
              )}</small>
            </li>
          `
        )
        .join("")}
    </ol>
  `;
}

function renderList(
  label: string,
  items: readonly string[],
  className: string
): string {
  if (items.length === 0) {
    return "";
  }

  return `
    <div class="${className}">
      <strong>${escapeHtml(label)}</strong>
      <ul>
        ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
      </ul>
    </div>
  `;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
