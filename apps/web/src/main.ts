import {
  createMockSession,
  createMockTradingDeskTurn,
  submitMockTradingDeskConfirmation,
  type CommandSource,
  type MockTradingDeskState
} from "@streetspeak-ai/core";
import type { BrowserSpeechHost } from "@streetspeak-ai/voice";
import {
  BrowserVoiceController,
  createInitialBrowserVoiceState,
  type BrowserVoiceState
} from "./browser-speech";
import {
  getBrowserLocalStorage,
  getDemoSafetyFlags,
  hasAcceptedOnboarding,
  loadDemoSettings,
  REQUIRED_ONBOARDING_ACKNOWLEDGEMENTS,
  resetDemoState,
  resetOnboardingAcceptance,
  saveDemoSettings,
  saveOnboardingAcceptance,
  type DemoSettings,
  type LocalDemoStorage,
  type OnboardingAcknowledgementId
} from "./demo-state";
import "./styles.css";

const EXAMPLE_COMMANDS = [
  "buy 5 HOOD",
  "sell 2 SOFI",
  "build a limit order to buy 3 AAPL at 175",
  "show my portfolio",
  "what is HOOD trading at",
  "buy $500 of HOOD"
] as const;

const session = createMockSession();
const app = document.querySelector<HTMLElement>("#app");

if (app) {
  const storage = getBrowserLocalStorage();
  const browserHost: BrowserSpeechHost | null =
    typeof window === "undefined" ? null : (window as BrowserSpeechHost);
  let currentState: MockTradingDeskState | null = null;
  let settings = loadDemoSettings(storage);
  let onboardingAccepted = hasAcceptedOnboarding(storage);
  let onboardingChecks = new Set<OnboardingAcknowledgementId>();
  let busy = false;
  let voiceState = createInitialBrowserVoiceState(
    browserHost,
    settings.browserVoiceInputEnabled
  );
  const voiceController = new BrowserVoiceController(
    browserHost,
    {
      onStateChange(state) {
        voiceState = state;
        render();
      },
      onCommand(text, source) {
        void runCommand(text, source);
      }
    },
    settings.browserVoiceInputEnabled
  );

  const render = (): void => {
    app.innerHTML = createMarkup({
      state: currentState,
      busy,
      onboardingAccepted,
      onboardingChecks,
      settings,
      storageAvailable: storage !== null,
      voiceState
    });
    bindEvents();
  };

  const runCommand = async (
    command: string,
    source: CommandSource = "keyboard"
  ): Promise<void> => {
    if (!onboardingAccepted) {
      return;
    }

    busy = true;
    render();

    currentState = await createMockTradingDeskTurn(command, {
      session,
      source
    });
    busy = false;
    render();
  };

  const submitConfirmation = async (
    confirmationText: string
  ): Promise<void> => {
    if (!currentState || !onboardingAccepted) {
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

  const resetLocalDemo = (): void => {
    resetDemoState(storage);
    voiceController.setEnabled(settings.browserVoiceInputEnabled);
    voiceState = voiceController.state;
    currentState = null;
    busy = false;
    render();
  };

  const updateSettings = (nextSettings: DemoSettings): void => {
    settings = saveDemoSettings(storage, nextSettings);
    voiceController.setEnabled(settings.browserVoiceInputEnabled);
    voiceState = voiceController.state;
    render();
  };

  const bindEvents = (): void => {
    bindOnboardingEvents(storage, {
      onboardingChecks,
      onChecksChanged(checks) {
        onboardingChecks = checks;
        render();
      },
      onAccepted() {
        saveOnboardingAcceptance(storage);
        onboardingAccepted = true;
        onboardingChecks = new Set();
        render();
        void runCommand("show my portfolio");
      }
    });

    const commandForm = app.querySelector<HTMLFormElement>("#command-form");
    const commandInput = app.querySelector<HTMLInputElement>("#command-input");
    const confirmationForm =
      app.querySelector<HTMLFormElement>("#confirmation-form");
    const confirmationInput = app.querySelector<HTMLInputElement>(
      "#confirmation-input"
    );
    const exampleButtons =
      app.querySelectorAll<HTMLButtonElement>("[data-command]");
    const voiceButton = app.querySelector<HTMLButtonElement>(
      "#browser-voice-button"
    );
    const stopVoiceButton = app.querySelector<HTMLButtonElement>(
      "#stop-browser-voice-button"
    );
    const voiceToggle = app.querySelector<HTMLInputElement>(
      "#setting-browser-voice"
    );
    const auditToggle = app.querySelector<HTMLInputElement>(
      "#setting-show-audit"
    );
    const resetDemoButton =
      app.querySelector<HTMLButtonElement>("#reset-demo-state");
    const resetOnboardingButton = app.querySelector<HTMLButtonElement>(
      "#reset-onboarding-acknowledgement"
    );

    commandForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      const command = commandInput?.value.trim() ?? "";

      if (command) {
        void runCommand(command, "keyboard");
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
          void runCommand(command, "keyboard");
        }
      });
    }

    voiceButton?.addEventListener("click", () => {
      voiceController.start();
    });

    stopVoiceButton?.addEventListener("click", () => {
      voiceController.stop();
    });

    voiceToggle?.addEventListener("change", () => {
      updateSettings({
        ...settings,
        browserVoiceInputEnabled: Boolean(voiceToggle.checked)
      });
    });

    auditToggle?.addEventListener("change", () => {
      updateSettings({
        ...settings,
        showAuditTimeline: Boolean(auditToggle.checked)
      });
    });

    resetDemoButton?.addEventListener("click", resetLocalDemo);

    resetOnboardingButton?.addEventListener("click", () => {
      resetOnboardingAcceptance(storage);
      resetLocalDemo();
      onboardingAccepted = false;
      onboardingChecks = new Set();
      render();
    });
  };

  render();

  if (onboardingAccepted) {
    void runCommand("show my portfolio");
  }
}

interface MarkupOptions {
  readonly state: MockTradingDeskState | null;
  readonly busy: boolean;
  readonly onboardingAccepted: boolean;
  readonly onboardingChecks: ReadonlySet<OnboardingAcknowledgementId>;
  readonly settings: DemoSettings;
  readonly storageAvailable: boolean;
  readonly voiceState: BrowserVoiceState;
}

function createMarkup(options: MarkupOptions): string {
  const {
    state,
    busy,
    onboardingAccepted,
    onboardingChecks,
    settings,
    storageAvailable,
    voiceState
  } = options;
  const confirmationDisabled =
    busy ||
    !onboardingAccepted ||
    !state?.challenge ||
    state.status === "mock_submitted";

  return `
    <main class="desk-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">StreetSpeak AI</p>
          <h1>Voice-native mock trading desk</h1>
          <p class="subtitle">A local, safety-first demo for self-directed trading workflows.</p>
        </div>
        <div class="mode-stack" aria-label="mode status">
          <span class="badge">Mock mode locked on</span>
          <span class="badge badge-danger">Live trading unavailable</span>
        </div>
      </header>

      <section class="warning-band">
        <strong>No live broker execution.</strong>
        This local demo uses static mock quotes, a fake portfolio, exact confirmation challenges, and an in-memory audit timeline. It is not investment advice.
      </section>

      ${renderSettings(settings, storageAvailable)}

      <section class="command-band" aria-label="mock command input">
        <div class="command-layout">
          <form id="command-form" class="command-form">
            <label for="command-input">Command input</label>
            <div class="command-row">
              <input
                id="command-input"
                name="command"
                type="text"
                autocomplete="off"
                placeholder="buy 5 HOOD"
                ${busy || !onboardingAccepted ? "disabled" : ""}
              />
              <button type="submit" ${busy || !onboardingAccepted ? "disabled" : ""}>Run</button>
            </div>
          </form>
          ${renderVoiceInput(voiceState, settings, busy, onboardingAccepted)}
        </div>
        <div>
          <p class="section-label">Try this command</p>
          <div class="examples" aria-label="example commands">
            ${EXAMPLE_COMMANDS.map((command) =>
              renderExampleButton(command, busy || !onboardingAccepted)
            ).join("")}
          </div>
        </div>
      </section>

      <section class="desk-grid">
        <section class="panel panel-span" aria-label="mock response">
          <div class="panel-heading">
            <h2>Answer Output</h2>
            ${state ? `<span class="status-pill">${escapeHtml(state.status)}</span>` : ""}
          </div>
          <p class="answer">${escapeHtml(state?.answer ?? state?.message ?? "Accept the local safety onboarding, then run a mock command.")}</p>
          ${renderQuote(state)}
        </section>

        <section class="panel" aria-label="mock portfolio">
          <div class="panel-heading">
            <h2>Mock Portfolio</h2>
            <span class="muted">static fixture</span>
          </div>
          ${renderPortfolio(state)}
        </section>

        <section class="panel" aria-label="parsed command">
          <div class="panel-heading">
            <h2>Parsed Intent</h2>
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
            <span class="muted">exact phrase and code required</span>
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
            <span class="muted">local memory</span>
          </div>
          ${settings.showAuditTimeline ? renderAuditTimeline(state) : `<p class="empty">Audit timeline is hidden by local settings.</p>`}
        </section>
      </section>
    </main>
    ${
      onboardingAccepted
        ? ""
        : renderOnboardingModal(onboardingChecks, storageAvailable)
    }
  `;
}

function renderSettings(
  settings: DemoSettings,
  storageAvailable: boolean
): string {
  const flags = getDemoSafetyFlags();

  return `
    <section class="settings-panel" aria-label="local demo settings">
      <div>
        <p class="section-label">Local settings</p>
        <dl class="settings-status">
          <div><dt>Mock mode</dt><dd>${flags.mockModeLocked ? "locked on" : "off"}</dd></div>
          <div><dt>Live trading</dt><dd>${flags.liveTradingAvailable ? "available" : "unavailable / disabled"}</dd></div>
          <div><dt>Storage</dt><dd>${storageAvailable ? "local browser only" : "not available"}</dd></div>
        </dl>
      </div>
      <div class="settings-controls">
        <label class="toggle-row" for="setting-browser-voice">
          <input id="setting-browser-voice" type="checkbox" ${settings.browserVoiceInputEnabled ? "checked" : ""} />
          <span>Browser voice input</span>
        </label>
        <label class="toggle-row" for="setting-show-audit">
          <input id="setting-show-audit" type="checkbox" ${settings.showAuditTimeline ? "checked" : ""} />
          <span>Show audit timeline</span>
        </label>
        <div class="settings-actions">
          <button id="reset-demo-state" type="button" class="secondary-button">Reset demo state</button>
          <button id="reset-onboarding-acknowledgement" type="button" class="secondary-button">Reset onboarding</button>
        </div>
      </div>
    </section>
  `;
}

function renderVoiceInput(
  voiceState: BrowserVoiceState,
  settings: DemoSettings,
  busy: boolean,
  onboardingAccepted: boolean
): string {
  const canStart =
    onboardingAccepted &&
    settings.browserVoiceInputEnabled &&
    voiceState.status !== "unsupported" &&
    voiceState.status !== "listening" &&
    !busy;
  const canStop = voiceState.status === "listening";

  return `
    <div class="voice-panel" aria-label="browser voice input">
      <div class="voice-heading">
        <span class="section-label">Browser voice</span>
        <span class="status-pill">${escapeHtml(voiceState.status)}</span>
      </div>
      <div class="voice-actions">
        <button id="browser-voice-button" type="button" ${canStart ? "" : "disabled"}>Start voice</button>
        <button id="stop-browser-voice-button" type="button" class="secondary-button" ${canStop ? "" : "disabled"}>Stop</button>
      </div>
      <p class="voice-note">${escapeHtml(voiceState.message)}</p>
      <p class="voice-note">Browser-native speech behavior depends on the browser and device. StreetSpeak AI does not store raw audio or upload raw audio to a StreetSpeak server.</p>
      ${
        voiceState.lastTranscript
          ? `<p class="transcript">Transcript: ${escapeHtml(voiceState.lastTranscript)}</p>`
          : ""
      }
    </div>
  `;
}

function renderOnboardingModal(
  checks: ReadonlySet<OnboardingAcknowledgementId>,
  storageAvailable: boolean
): string {
  const allChecked = REQUIRED_ONBOARDING_ACKNOWLEDGEMENTS.every(
    (acknowledgement) => checks.has(acknowledgement.id)
  );

  return `
    <div class="modal-backdrop" role="presentation">
      <section class="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <p class="eyebrow">First-run safety onboarding</p>
        <h2 id="onboarding-title">Acknowledge the mock-only demo boundaries</h2>
        <p class="modal-copy">These acknowledgements are stored only in this browser's local storage. No account is created and nothing is sent to a server.</p>
        ${
          storageAvailable
            ? ""
            : `<p class="rejected">Local storage is unavailable, so onboarding acceptance cannot be saved in this browser session.</p>`
        }
        <form id="onboarding-form">
          <fieldset class="ack-list">
            <legend>Required acknowledgements</legend>
            ${REQUIRED_ONBOARDING_ACKNOWLEDGEMENTS.map(
              (acknowledgement) => `
                <label class="ack-row" for="ack-${escapeHtml(acknowledgement.id)}">
                  <input
                    id="ack-${escapeHtml(acknowledgement.id)}"
                    name="acknowledgement"
                    type="checkbox"
                    value="${escapeHtml(acknowledgement.id)}"
                    ${checks.has(acknowledgement.id) ? "checked" : ""}
                  />
                  <span>${escapeHtml(acknowledgement.label)}</span>
                </label>
              `
            ).join("")}
          </fieldset>
          <button type="submit" class="primary-button" ${allChecked && storageAvailable ? "" : "disabled"}>Accept and open mock demo</button>
        </form>
      </section>
    </div>
  `;
}

function bindOnboardingEvents(
  storage: LocalDemoStorage | null,
  callbacks: {
    readonly onboardingChecks: ReadonlySet<OnboardingAcknowledgementId>;
    onChecksChanged(checks: Set<OnboardingAcknowledgementId>): void;
    onAccepted(): void;
  }
): void {
  const onboardingForm =
    app?.querySelector<HTMLFormElement>("#onboarding-form");

  if (!onboardingForm) {
    return;
  }

  const checkboxes = onboardingForm.querySelectorAll<HTMLInputElement>(
    'input[name="acknowledgement"]'
  );

  for (const checkbox of checkboxes) {
    checkbox.addEventListener("change", () => {
      const nextChecks = new Set(callbacks.onboardingChecks);
      const acknowledgementId = checkbox.value as OnboardingAcknowledgementId;

      if (checkbox.checked) {
        nextChecks.add(acknowledgementId);
      } else {
        nextChecks.delete(acknowledgementId);
      }

      callbacks.onChecksChanged(nextChecks);
    });
  }

  onboardingForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!storage) {
      return;
    }

    const allChecked = REQUIRED_ONBOARDING_ACKNOWLEDGEMENTS.every(
      (acknowledgement) => callbacks.onboardingChecks.has(acknowledgement.id)
    );

    if (allChecked) {
      callbacks.onAccepted();
    }
  });
}

function renderExampleButton(command: string, disabled: boolean): string {
  return `<button type="button" class="example-button" data-command="${escapeHtml(
    command
  )}" ${disabled ? "disabled" : ""}>${escapeHtml(command)}</button>`;
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

function renderQuote(state: MockTradingDeskState | null): string {
  const quote = state?.quote;

  if (!quote) {
    return "";
  }

  return `
    <dl class="quote-strip" aria-label="current mock quote">
      <div><dt>Symbol</dt><dd>${escapeHtml(quote.symbol)}</dd></div>
      <div><dt>Last</dt><dd>${formatCurrency(quote.last)}</dd></div>
      <div><dt>Bid</dt><dd>${formatCurrency(quote.bid)}</dd></div>
      <div><dt>Ask</dt><dd>${formatCurrency(quote.ask)}</dd></div>
      <div><dt>Source</dt><dd>${escapeHtml(quote.label)}</dd></div>
    </dl>
  `;
}

function renderParsedCommand(state: MockTradingDeskState | null): string {
  if (!state) {
    return `<p class="empty">No command parsed yet.</p>`;
  }

  const details = [
    ["Source", state.command.source],
    ["Route", state.route.intent],
    ["Confidence", state.route.confidence.toFixed(2)],
    ["Advisory boundary", state.route.advisoryBoundary]
  ];

  if (state.parse.kind === "order_ticket") {
    details.push(["Kind", "order ticket"], ["Summary", state.parse.summary]);
  } else if (state.parse.kind === "portfolio_question") {
    details.push(
      ["Kind", "portfolio question"],
      ["Summary", state.parse.summary]
    );
  } else if (state.parse.kind === "quote_question") {
    details.push(["Kind", "quote question"], ["Summary", state.parse.summary]);
  } else {
    details.push(["Kind", state.parse.kind], ["Message", state.parse.message]);
  }

  return `
    <dl class="detail-list">
      ${details
        .map(
          ([label, value]) =>
            `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
        )
        .join("")}
    </dl>
  `;
}

function renderTicket(state: MockTradingDeskState | null): string {
  const ticket = state?.ticket;

  if (!ticket) {
    if (state?.parse.kind === "unsupported") {
      return `<p class="rejected">${escapeHtml(state.parse.message)}</p>`;
    }

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
      <div><dt>Mode</dt><dd>${escapeHtml(ticket.mode)}</dd></div>
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
      <div><dt>Ticket</dt><dd>${escapeHtml(review.ticketId)}</dd></div>
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
    <dl class="detail-list">
      <div><dt>Challenge code</dt><dd>${escapeHtml(challenge.code)}</dd></div>
      <div><dt>Expires</dt><dd>${escapeHtml(formatDate(challenge.expiresAt))}</dd></div>
      <div><dt>Status</dt><dd>${escapeHtml(challenge.status)}</dd></div>
    </dl>
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
      <div><dt>Live execution</dt><dd>${String(response.liveExecutionAvailable)}</dd></div>
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
              <small>${escapeHtml(event.actor)} - ${escapeHtml(
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
