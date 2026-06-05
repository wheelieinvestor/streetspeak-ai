import {
  createAuditTimelineExport,
  createMockTradeReceipt,
  renderMockTradeReceiptMarkdown,
  serializeAuditExport,
  type AuditEvent,
  type MockTradeReceiptExport
} from "@streetspeak-ai/audit";
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
  appendAuditEvents,
  clearAuditTimeline,
  exportAuditTimeline,
  getBrowserLocalStorage,
  getDemoSafetyFlags,
  hasAcceptedOnboarding,
  loadAuditTimeline,
  loadDemoSettings,
  REQUIRED_ONBOARDING_ACKNOWLEDGEMENTS,
  resetAllDemoData,
  resetDemoState,
  resetOnboardingAcceptance,
  saveDemoSettings,
  saveOnboardingAcceptance,
  type DemoSettings,
  type LocalDemoStorage,
  type OnboardingAcknowledgementId
} from "./demo-state";
import {
  createRobinhoodFixtureExplorerModel,
  V01_SAFETY_CHECKLIST,
  V01_MOCK_DEMO_STATUS,
  type RobinhoodFixtureExplorerModel
} from "./robinhood-fixture-explorer";
import {
  createRobinhoodMcpReadOnlyPanelModel,
  getBrowserRobinhoodMcpReadOnlyClient,
  loadRobinhoodMcpReadOnlyPanelModel,
  type BrowserRobinhoodMcpReadOnlyClientHost,
  type RobinhoodMcpReadOnlyPanelModel,
  type RobinhoodMcpReadOnlyPanelQuery
} from "./robinhood-mcp-readonly-panel";
import "./styles.css";

const EXAMPLE_COMMANDS = [
  "buy 5 HOOD",
  "sell 2 SOFI",
  "build a limit order to buy 3 AAPL at 175",
  "show my portfolio",
  "what is HOOD trading at",
  "buy $500 of HOOD"
] as const;

const DEFAULT_ROBINHOOD_MCP_QUERY: RobinhoodMcpReadOnlyPanelQuery = {
  quoteSymbol: "HOOD",
  tradabilitySymbol: "HOOD",
  searchQuery: "hood"
};

const WORKFLOW_STEPS = [
  "User command",
  "Parsed intent",
  "Ticket",
  "Safety review",
  "Exact confirmation",
  "Mock receipt"
] as const;

const HERO_GUARDRAILS = [
  ["Mode", "Mock only"],
  ["Live trading", "Unavailable"],
  ["Confirmation", "Exact phrase/code"],
  ["Data", "Local and redacted"]
] as const;

const session = createMockSession();
const app = document.querySelector<HTMLElement>("#app");

if (app) {
  const storage = getBrowserLocalStorage();
  const browserHost: BrowserSpeechHost | null =
    typeof window === "undefined" ? null : (window as BrowserSpeechHost);
  const robinhoodMcpHost: BrowserRobinhoodMcpReadOnlyClientHost | null =
    typeof window === "undefined"
      ? null
      : (window as BrowserRobinhoodMcpReadOnlyClientHost);
  let currentState: MockTradingDeskState | null = null;
  let settings = loadDemoSettings(storage);
  let persistedAuditTimeline = loadAuditTimeline(storage);
  let onboardingAccepted = hasAcceptedOnboarding(storage);
  let onboardingChecks = new Set<OnboardingAcknowledgementId>();
  let busy = false;
  let exportStatusMessage = "";
  let receiptMarkdownPreview = "";
  let robinhoodMcpQuery = DEFAULT_ROBINHOOD_MCP_QUERY;
  let robinhoodMcpBusy = false;
  let robinhoodMcpPanel = createRobinhoodMcpReadOnlyPanelModel({
    client: getBrowserRobinhoodMcpReadOnlyClient(robinhoodMcpHost),
    query: robinhoodMcpQuery
  });
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
      persistedAuditTimeline,
      exportStatusMessage,
      receiptMarkdownPreview,
      robinhoodMcpPanel,
      robinhoodMcpBusy,
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
    persistedAuditTimeline = appendAuditEvents(
      storage,
      currentState.auditTimeline
    );
    exportStatusMessage = "Redacted audit events saved to this browser.";
    receiptMarkdownPreview = "";
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
    persistedAuditTimeline = appendAuditEvents(
      storage,
      currentState.auditTimeline
    );
    exportStatusMessage = "Redacted audit events saved to this browser.";
    receiptMarkdownPreview = "";
    busy = false;
    render();
  };

  const resetLocalDemo = (): void => {
    resetDemoState(storage);
    voiceController.setEnabled(settings.browserVoiceInputEnabled);
    voiceState = voiceController.state;
    currentState = null;
    receiptMarkdownPreview = "";
    exportStatusMessage = "Transient demo fields were reset.";
    busy = false;
    render();
  };

  const clearLocalAuditTimeline = (): void => {
    persistedAuditTimeline = clearAuditTimeline(storage);
    exportStatusMessage = "Local audit timeline cleared from this browser.";
    render();
  };

  const resetEveryLocalDemoValue = (): void => {
    resetAllDemoData(storage);
    settings = loadDemoSettings(storage);
    onboardingAccepted = false;
    onboardingChecks = new Set();
    persistedAuditTimeline = loadAuditTimeline(storage);
    currentState = null;
    receiptMarkdownPreview = "";
    exportStatusMessage =
      "All local demo data was reset in this browser, including onboarding, settings, and audit events.";
    voiceController.setEnabled(settings.browserVoiceInputEnabled);
    voiceState = voiceController.state;
    busy = false;
    render();
  };

  const copyReceiptMarkdown = async (): Promise<void> => {
    const receipt = createReceiptForCurrentState(currentState);

    if (!receipt) {
      exportStatusMessage =
        "Complete an exact-code mock submission before exporting a trade receipt.";
      render();
      return;
    }

    const markdown = renderMockTradeReceiptMarkdown(receipt);
    receiptMarkdownPreview = markdown;

    if (!navigator.clipboard) {
      exportStatusMessage =
        "Receipt Markdown is shown below. Clipboard access is unavailable in this browser.";
      render();
      return;
    }

    try {
      await navigator.clipboard.writeText(markdown);
      exportStatusMessage =
        "Receipt Markdown copied locally. No upload or public URL was created.";
    } catch {
      exportStatusMessage =
        "Receipt Markdown is shown below. This browser blocked clipboard access.";
    }
    render();
  };

  const downloadReceiptJson = (): void => {
    const receipt = createReceiptForCurrentState(currentState);

    if (!receipt) {
      exportStatusMessage =
        "Complete an exact-code mock submission before exporting a trade receipt.";
      render();
      return;
    }

    receiptMarkdownPreview = renderMockTradeReceiptMarkdown(receipt);
    downloadJsonFile("streetspeak-ai-mock-receipt.json", receipt);
    exportStatusMessage =
      "Receipt JSON downloaded locally. No upload or public URL was created.";
    render();
  };

  const downloadAuditJson = (): void => {
    const auditExport = storage
      ? exportAuditTimeline(storage)
      : createAuditTimelineExport(persistedAuditTimeline);

    downloadJsonFile("streetspeak-ai-audit-timeline.json", auditExport);
    exportStatusMessage =
      "Audit timeline JSON downloaded locally from this browser.";
    render();
  };

  const updateSettings = (nextSettings: DemoSettings): void => {
    settings = saveDemoSettings(storage, nextSettings);
    voiceController.setEnabled(settings.browserVoiceInputEnabled);
    voiceState = voiceController.state;
    render();
  };

  const refreshRobinhoodMcpPanel = async (
    query: RobinhoodMcpReadOnlyPanelQuery
  ): Promise<void> => {
    robinhoodMcpQuery = query;
    robinhoodMcpBusy = true;
    robinhoodMcpPanel = {
      ...robinhoodMcpPanel,
      query
    };
    render();

    robinhoodMcpPanel = await loadRobinhoodMcpReadOnlyPanelModel({
      client: getBrowserRobinhoodMcpReadOnlyClient(robinhoodMcpHost),
      query
    });
    robinhoodMcpBusy = false;
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
    const clearAuditButton = app.querySelector<HTMLButtonElement>(
      "#clear-audit-timeline"
    );
    const copyReceiptButton = app.querySelector<HTMLButtonElement>(
      "#copy-receipt-markdown"
    );
    const downloadReceiptButton = app.querySelector<HTMLButtonElement>(
      "#download-receipt-json"
    );
    const downloadAuditButton = app.querySelector<HTMLButtonElement>(
      "#download-audit-json"
    );
    const resetAllDemoDataButton = app.querySelector<HTMLButtonElement>(
      "#reset-all-demo-data"
    );
    const robinhoodMcpForm = app.querySelector<HTMLFormElement>(
      "#robinhood-mcp-readonly-form"
    );
    const robinhoodMcpQuoteInput = app.querySelector<HTMLInputElement>(
      "#robinhood-mcp-quote-symbol"
    );
    const robinhoodMcpTradabilityInput = app.querySelector<HTMLInputElement>(
      "#robinhood-mcp-tradability-symbol"
    );
    const robinhoodMcpSearchInput = app.querySelector<HTMLInputElement>(
      "#robinhood-mcp-search-query"
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

    clearAuditButton?.addEventListener("click", clearLocalAuditTimeline);

    copyReceiptButton?.addEventListener("click", () => {
      void copyReceiptMarkdown();
    });

    downloadReceiptButton?.addEventListener("click", downloadReceiptJson);

    downloadAuditButton?.addEventListener("click", downloadAuditJson);

    resetAllDemoDataButton?.addEventListener("click", resetEveryLocalDemoValue);

    robinhoodMcpForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      void refreshRobinhoodMcpPanel({
        quoteSymbol:
          robinhoodMcpQuoteInput?.value.trim() ||
          DEFAULT_ROBINHOOD_MCP_QUERY.quoteSymbol,
        tradabilitySymbol:
          robinhoodMcpTradabilityInput?.value.trim() ||
          DEFAULT_ROBINHOOD_MCP_QUERY.tradabilitySymbol,
        searchQuery:
          robinhoodMcpSearchInput?.value.trim() ||
          DEFAULT_ROBINHOOD_MCP_QUERY.searchQuery
      });
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
  readonly persistedAuditTimeline: readonly AuditEvent[];
  readonly exportStatusMessage: string;
  readonly receiptMarkdownPreview: string;
  readonly robinhoodMcpPanel: RobinhoodMcpReadOnlyPanelModel;
  readonly robinhoodMcpBusy: boolean;
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
    persistedAuditTimeline,
    exportStatusMessage,
    receiptMarkdownPreview,
    robinhoodMcpPanel,
    robinhoodMcpBusy,
    storageAvailable,
    voiceState
  } = options;
  const confirmationDisabled =
    busy ||
    !onboardingAccepted ||
    !state?.challenge ||
    state.status === "mock_submitted";
  const robinhoodFixtureExplorer = createRobinhoodFixtureExplorerModel();
  const commandPlaceholder =
    voiceState.status === "listening"
      ? "StreetSpeak AI is listening…"
      : "Type a mock command, e.g. buy 5 HOOD";

  return `
    <main class="desk-shell">
      <header class="app-hero">
        <nav class="top-nav" aria-label="StreetSpeak AI sections">
          <a class="brand-mark" href="#command-center" aria-label="StreetSpeak AI command center">
            <span class="brand-glyph" aria-hidden="true">SS</span>
            <span>StreetSpeak AI</span>
          </a>
          <div class="nav-links">
            <a href="#command-center">Command</a>
            <a href="#mock-desk">Desk</a>
            <a href="#robinhood-boundary">Robinhood</a>
            <a href="#local-exports">Exports</a>
          </div>
          <div class="mode-stack" aria-label="mode status">
            <span class="badge badge-positive">Mock Only</span>
            <span class="badge badge-danger">No Live Trading</span>
          </div>
        </nav>

        <div class="hero-grid">
          <div class="hero-copy">
            <p class="eyebrow">Local v0.1 product demo</p>
            <h1>StreetSpeak AI</h1>
            <p class="hero-tagline">Voice-native trading desk for AI agents</p>
            <p class="subtitle">A screenshot-ready local mock workflow for self-directed users: static portfolio data, mock tickets, exact-code confirmation, local receipts, and no investment advice.</p>
            <div class="hero-actions">
              <a class="primary-button" href="#command-center">Open command center</a>
              <a class="secondary-button" href="#robinhood-boundary">View read-only boundary</a>
            </div>
          </div>

          <aside class="hero-status-card" aria-label="demo guardrails">
            <div class="panel-heading">
              <h2>Demo Guardrails</h2>
              <span class="status-pill">v0.1 local</span>
            </div>
            <dl class="hero-metrics">
              ${HERO_GUARDRAILS.map(
                ([label, value]) =>
                  `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
              ).join("")}
            </dl>
          </aside>
        </div>
      </header>

      <section class="status-strip" aria-label="public demo guardrails">
        <div>
          <strong>No live broker execution</strong>
          <span>Static mock quotes, fake portfolio fixtures, exact confirmation challenges, and redacted browser-local audit events.</span>
        </div>
        <div>
          <strong>Not investment advice</strong>
          <span>StreetSpeak AI is a self-directed trading utility demo, not a recommendation engine.</span>
        </div>
      </section>

      <section class="product-status-row" aria-label="product status">
        <div><span class="status-dot status-dot-active"></span><strong>Mock trading desk</strong><span>active</span></div>
        <div><span class="status-dot"></span><strong>Robinhood read-only</strong><span>gated / unconfigured</span></div>
        <div><span class="status-dot status-dot-danger"></span><strong>Live trading</strong><span>unavailable</span></div>
      </section>

      <section id="command-center" class="command-band" aria-label="mock command input">
        <div class="command-layout">
          <div class="command-card">
            <div class="command-card-heading">
              <div>
                <p class="section-label">Command Center</p>
                <h2>Mock trading desk command</h2>
              </div>
              <span class="status-pill">${busy ? "processing" : onboardingAccepted ? "ready" : "onboarding required"}</span>
            </div>
            <form id="command-form" class="command-form ${voiceState.status === "listening" ? "is-listening" : ""}">
              <label for="command-input">AI command bar</label>
              <div class="command-row">
                <input
                  id="command-input"
                  name="command"
                  type="text"
                  autocomplete="off"
                  placeholder="${commandPlaceholder}"
                  ${busy || !onboardingAccepted ? "disabled" : ""}
                />
                <button type="submit" ${busy || !onboardingAccepted ? "disabled" : ""}>Run mock</button>
              </div>
            </form>
            <div class="examples-block">
              <p class="section-label">Example commands</p>
              <div class="examples" aria-label="example commands">
                ${EXAMPLE_COMMANDS.map((command) =>
                  renderExampleButton(command, busy || !onboardingAccepted)
                ).join("")}
              </div>
            </div>
          </div>
          ${renderVoiceInput(voiceState, settings, busy, onboardingAccepted)}
        </div>
      </section>

      <section class="workflow-rail" aria-label="mock trading workflow">
        ${WORKFLOW_STEPS.map(
          (step, index) =>
            `<div class="workflow-step ${getWorkflowStepClass(state, index)}"><span>${index + 1}</span>${escapeHtml(step)}</div>`
        ).join("")}
      </section>

      ${renderSettings(settings, storageAvailable)}

      ${renderV01MockDemoStatus()}

      <section id="mock-desk" class="section-group" aria-label="Mock Trading Desk">
        <div class="section-header">
          <div>
            <p class="eyebrow">Mock Trading Desk</p>
            <h2>Command-to-receipt workflow</h2>
          </div>
          <div class="mode-stack">
            <span class="badge badge-positive">Mock Only</span>
            <span class="badge badge-danger">No Live Trading</span>
          </div>
        </div>

        <section class="desk-grid">
          <section class="panel panel-span answer-panel" aria-label="mock response">
            <div class="panel-heading">
              <h2>Answer Output</h2>
              ${state ? `<span class="status-pill">${escapeHtml(state.status)}</span>` : ""}
            </div>
            <p class="answer">${escapeHtml(state?.answer ?? state?.message ?? "Accept the local safety onboarding, then run a mock command.")}</p>
            ${renderQuote(state)}
          </section>

          <section class="panel portfolio-panel" aria-label="mock portfolio">
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

          <section class="panel ticket-panel" aria-label="order ticket">
            <div class="panel-heading">
              <h2>Order Ticket</h2>
              <span class="muted">mock equity</span>
            </div>
            ${renderTicket(state)}
          </section>

          <section class="panel safety-panel" aria-label="safety review">
            <div class="panel-heading">
              <h2>Safety Review</h2>
              <span class="muted">required</span>
            </div>
            ${renderSafety(state)}
          </section>

          <section class="panel panel-span confirmation-panel" aria-label="confirmation">
            <div class="panel-heading">
              <h2>Confirmation Challenge</h2>
              <span class="muted">exact phrase and code required</span>
            </div>
            ${renderConfirmation(state, confirmationDisabled, busy)}
          </section>

          <section class="panel broker-panel" aria-label="mock broker response">
            <div class="panel-heading">
              <h2>Mock Broker Response</h2>
              <span class="muted">no live order</span>
            </div>
            ${renderBrokerResponse(state)}
          </section>

          <section id="local-exports" class="panel panel-span receipt-panel" aria-label="local exports and receipts">
            <div class="panel-heading">
              <h2>Receipts And Local Exports</h2>
              <span class="badge badge-danger">Mock Only / No Live Trading</span>
            </div>
            ${renderExportPanel(state, persistedAuditTimeline, exportStatusMessage, receiptMarkdownPreview, storageAvailable)}
          </section>

          <section class="panel audit-panel" aria-label="audit timeline">
            <div class="panel-heading">
              <h2>Audit Timeline</h2>
              <span class="muted">local browser storage</span>
            </div>
            ${settings.showAuditTimeline ? renderAuditTimeline(persistedAuditTimeline) : `<p class="empty">Audit timeline is hidden by local settings.</p>`}
          </section>
        </section>
      </section>

      <section id="robinhood-boundary" class="section-group robinhood-section" aria-label="Robinhood boundaries">
        <div class="section-header">
          <div>
            <p class="eyebrow">Robinhood Boundary</p>
            <h2>Fixture explorer and MCP read-only panel</h2>
          </div>
          <div class="mode-stack">
            <span class="badge">Read-Only</span>
            <span class="badge badge-danger">No Order Actions</span>
          </div>
        </div>
        ${renderRobinhoodFixtureExplorer(robinhoodFixtureExplorer)}
        ${renderRobinhoodMcpReadOnlyPanel(robinhoodMcpPanel, robinhoodMcpBusy)}
      </section>
    </main>
    ${
      onboardingAccepted
        ? ""
        : renderOnboardingModal(onboardingChecks, storageAvailable)
    }
  `;
}

function getWorkflowStepClass(
  state: MockTradingDeskState | null,
  index: number
): string {
  const completedThrough = !state
    ? 0
    : state.status === "mock_submitted"
      ? 6
      : state.challenge
        ? 5
        : state.ticket
          ? 4
          : state.route.intent === "portfolio_question" ||
              state.route.intent === "market_question"
            ? 2
            : 1;
  const activeIndex = Math.max(0, Math.min(completedThrough, 5));

  if (index < completedThrough) {
    return "is-complete";
  }

  if (index === activeIndex) {
    return "is-active";
  }

  return "is-pending";
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

function renderV01MockDemoStatus(): string {
  return `
    <section class="status-panel" aria-label="v0.1 Mock Demo status">
      <div class="panel-heading">
        <h2>v0.1 Mock Demo</h2>
        <span class="badge badge-danger">Live trading unavailable</span>
      </div>
      <p class="status-copy">StreetSpeak AI is mock-first today. The mock trading desk is the primary demo, receipt and audit exports are local-only, and no live broker order can be placed.</p>
      <dl class="status-grid">
        ${V01_MOCK_DEMO_STATUS.map(
          (item) => `
            <div>
              <dt>${escapeHtml(item.label)}</dt>
              <dd>${escapeHtml(item.status)}</dd>
              <small>${escapeHtml(item.detail)}</small>
            </div>
          `
        ).join("")}
      </dl>
      <div class="fixture-section" aria-label="v0.1 safety checklist">
        <div class="fixture-section-heading">
          <h3>Safety Checklist</h3>
          <span>public demo boundary</span>
        </div>
        <ul class="education-list safety-checklist">
          ${V01_SAFETY_CHECKLIST.map(
            (item) =>
              `<li><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.detail)}</span></li>`
          ).join("")}
        </ul>
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
  const isListening = voiceState.status === "listening";
  const voiceMessage = isListening
    ? "StreetSpeak AI is listening…"
    : voiceState.message;

  return `
    <div class="voice-panel ${isListening ? "is-listening" : ""}" aria-label="browser voice input">
      <span class="voice-orb" aria-hidden="true"></span>
      <div class="voice-heading">
        <span class="section-label">Browser-native voice</span>
        <span class="status-pill">${escapeHtml(voiceState.status)}</span>
      </div>
      <div class="voice-actions">
        <button id="browser-voice-button" type="button" ${canStart ? "" : "disabled"}>Listen</button>
        <button id="stop-browser-voice-button" type="button" class="secondary-button" ${canStop ? "" : "disabled"}>Stop</button>
      </div>
      <p class="voice-note">${escapeHtml(voiceMessage)}</p>
      <p class="voice-note">Browser-native speech behavior depends on the browser and device. StreetSpeak AI does not store raw audio or send raw audio to a StreetSpeak server.</p>
      ${
        voiceState.lastTranscript
          ? `<div class="transcript"><span>Transcript preview</span><strong>${escapeHtml(voiceState.lastTranscript)}</strong></div>`
          : `<p class="transcript transcript-empty">Transcript preview appears here after browser speech returns text.</p>`
      }
    </div>
  `;
}

function renderRobinhoodMcpReadOnlyPanel(
  model: RobinhoodMcpReadOnlyPanelModel,
  busy: boolean
): string {
  const status = model.status;
  const accountRows =
    model.accountSummaries.length === 0
      ? `<li class="empty">No account summaries loaded. Identifiers remain redacted.</li>`
      : model.accountSummaries
          .map(
            (account) => `
              <li>
                <strong>${escapeHtml(account.accountLabel)}</strong>
                <span>${escapeHtml(account.accountType)} / ${escapeHtml(account.status)}</span>
                <small>${escapeHtml(account.source)} - identifier redacted: ${String(account.accountIdentifierRedacted)}</small>
              </li>
            `
          )
          .join("");
  const portfolio = model.portfolioSnapshot;
  const quote = model.quoteLookup;
  const tradability = model.tradabilityCheck;

  return `
    <section class="fixture-explorer real-readonly-panel" aria-label="Real Robinhood MCP Read-Only Connection">
      <div class="fixture-hero">
        <div>
          <p class="eyebrow">Externally managed MCP</p>
          <h2>${escapeHtml(model.title)}</h2>
          <p class="status-copy">This panel is read-only, separate from the mock trading desk and fixture explorer, and stores no Robinhood credentials or real read-only data in localStorage by default.</p>
        </div>
        <div class="mode-stack" aria-label="Robinhood MCP read-only status">
          <span class="badge">Read-Only</span>
          <span class="badge">${escapeHtml(model.readOnlyBadge)}</span>
          <span class="badge badge-danger">No Live Trading</span>
          <span class="badge badge-danger">No Order Actions</span>
        </div>
      </div>

      <section class="fixture-section" aria-label="Robinhood MCP adapter status">
        <div class="fixture-section-heading">
          <h3>Read-Only MCP Status</h3>
          <span>${escapeHtml(status.state)}</span>
        </div>
        <p class="empty">MCP configuration is managed outside StreetSpeak AI. No broker login form, API key field, token field, MCP URL field, order review, order placement, cancel order, or live execution is available here.</p>
        <dl class="detail-list fixture-status-list">
          <div><dt>Source</dt><dd>${escapeHtml(model.source)}</dd></div>
          <div><dt>Transport</dt><dd>${escapeHtml(status.transport)}</dd></div>
          <div><dt>Connection</dt><dd>${status.state === "available" ? "available" : "unavailable / unconfigured"}</dd></div>
          <div><dt>Credentials</dt><dd>${escapeHtml(status.credentialsManagement ?? "externally managed / not stored by StreetSpeak")}</dd></div>
          <div><dt>Credential fields required</dt><dd>${model.credentialFieldsRequired.length}</dd></div>
          <div><dt>Storage policy</dt><dd>${escapeHtml(model.storagePolicy)}</dd></div>
          <div><dt>Redacted smoke status</dt><dd>${escapeHtml(model.smokeStatus.replaceAll("_", " "))}</dd></div>
          <div><dt>Live execution available</dt><dd>${String(status.liveExecutionAvailable)}</dd></div>
          <div><dt>Order review available</dt><dd>${String(status.orderReviewAvailable)}</dd></div>
          <div><dt>Order placement available</dt><dd>${String(status.orderPlacementAvailable)}</dd></div>
          <div><dt>Cancel order available</dt><dd>${String(status.cancelOrderAvailable)}</dd></div>
        </dl>
        ${renderList("Read-only status errors", model.errors, "warning-list")}
      </section>

      <section class="fixture-section" aria-label="Robinhood MCP read-only query controls">
        <div class="fixture-section-heading">
          <h3>Read-Only Queries</h3>
          <span>account / portfolio / positions / quote / order history / tradability / search</span>
        </div>
        <form id="robinhood-mcp-readonly-form" class="command-form">
          <div class="query-grid">
            <label class="field-stack" for="robinhood-mcp-quote-symbol">
              <span>Quote symbol</span>
              <input id="robinhood-mcp-quote-symbol" type="text" value="${escapeHtml(model.query.quoteSymbol)}" autocomplete="off" />
            </label>
            <label class="field-stack" for="robinhood-mcp-tradability-symbol">
              <span>Tradability symbol</span>
              <input id="robinhood-mcp-tradability-symbol" type="text" value="${escapeHtml(model.query.tradabilitySymbol)}" autocomplete="off" />
            </label>
            <label class="field-stack" for="robinhood-mcp-search-query">
              <span>Search query</span>
              <input id="robinhood-mcp-search-query" type="text" value="${escapeHtml(model.query.searchQuery)}" autocomplete="off" />
            </label>
            <button type="submit" ${busy ? "disabled" : ""}>Refresh Read-Only Data</button>
          </div>
        </form>
        <p class="fixture-note">The refresh action can only call allowed read-only MCP tools. It does not review, place, execute, or cancel orders.</p>
      </section>

      <div class="fixture-grid">
        <section class="fixture-section" aria-label="Robinhood MCP redacted account summaries">
          <div class="fixture-section-heading"><h3>Account Summary</h3><span>redacted identifiers</span></div>
          <ul class="position-list fixture-list">${accountRows}</ul>
        </section>

        <section class="fixture-section" aria-label="Robinhood MCP portfolio summary">
          <div class="fixture-section-heading"><h3>Portfolio Summary</h3><span>in-memory only</span></div>
          ${
            portfolio
              ? `<dl class="detail-list">
                  <div><dt>Total equity</dt><dd>${formatCurrency(portfolio.totalEquityValue)}</dd></div>
                  <div><dt>Buying power</dt><dd>${formatCurrency(portfolio.buyingPower.buyingPower)}</dd></div>
                  <div><dt>Account identifier redacted</dt><dd>${String(portfolio.accountIdentifierRedacted)}</dd></div>
                  <div><dt>Source</dt><dd>${escapeHtml(portfolio.source)}</dd></div>
                </dl>`
              : `<p class="empty">No portfolio data loaded.</p>`
          }
        </section>

        <section class="fixture-section" aria-label="Robinhood MCP positions">
          <div class="fixture-section-heading"><h3>Positions</h3><span>read-only</span></div>
          <ul class="position-list fixture-list">
            ${
              model.positions.length === 0
                ? `<li class="empty">No positions loaded.</li>`
                : model.positions
                    .map(
                      (position) => `
                        <li>
                          <strong>${escapeHtml(position.symbol)}</strong>
                          <span>${position.quantity} shares</span>
                          <span>${formatCurrency(position.marketValue)}</span>
                          <small>${escapeHtml(position.source)}</small>
                        </li>
                      `
                    )
                    .join("")
            }
          </ul>
        </section>

        <section class="fixture-section" aria-label="Robinhood MCP quote lookup">
          <div class="fixture-section-heading"><h3>Quote Lookup</h3><span>read-only</span></div>
          ${
            quote
              ? `<dl class="detail-list">
                  <div><dt>Symbol</dt><dd>${escapeHtml(quote.symbol)}</dd></div>
                  <div><dt>Last</dt><dd>${formatCurrency(quote.last)}</dd></div>
                  <div><dt>Bid / Ask</dt><dd>${formatCurrency(quote.bid)} / ${formatCurrency(quote.ask)}</dd></div>
                  <div><dt>Source</dt><dd>${escapeHtml(quote.source)}</dd></div>
                </dl>`
              : `<p class="empty">No quote loaded.</p>`
          }
        </section>

        <section class="fixture-section" aria-label="Robinhood MCP order history">
          <div class="fixture-section-heading"><h3>Order History</h3><span>read-only / IDs redacted</span></div>
          <ul class="audit-list fixture-list">
            ${
              model.orderHistory.length === 0
                ? `<li class="empty">No order history loaded.</li>`
                : model.orderHistory
                    .map(
                      (order) => `
                        <li>
                          <span>${escapeHtml(order.status)} ${escapeHtml(order.side)} ${order.quantity} ${escapeHtml(order.symbol)}</span>
                          <small>${escapeHtml(order.id)} / raw order ID redacted: ${String(order.rawOrderIdentifierRedacted)}</small>
                        </li>
                      `
                    )
                    .join("")
            }
          </ul>
        </section>

        <section class="fixture-section" aria-label="Robinhood MCP tradability check">
          <div class="fixture-section-heading"><h3>Tradability Check</h3><span>read-only</span></div>
          ${
            tradability
              ? `<dl class="detail-list">
                  <div><dt>Symbol</dt><dd>${escapeHtml(tradability.symbol)}</dd></div>
                  <div><dt>Tradable</dt><dd>${String(tradability.tradable)}</dd></div>
                  <div><dt>Reason</dt><dd>${escapeHtml(tradability.reason)}</dd></div>
                  <div><dt>Source</dt><dd>${escapeHtml(tradability.source)}</dd></div>
                </dl>`
              : `<p class="empty">No tradability result loaded.</p>`
          }
        </section>

        <section class="fixture-section" aria-label="Robinhood MCP symbol search">
          <div class="fixture-section-heading"><h3>Symbol Search</h3><span>read-only</span></div>
          <ul class="audit-list fixture-list">
            ${
              model.symbolSearchResults.length === 0
                ? `<li class="empty">No search results loaded.</li>`
                : model.symbolSearchResults
                    .map(
                      (result) => `
                        <li>
                          <span>${escapeHtml(result.symbol)} - ${escapeHtml(result.name)}</span>
                          <small>${escapeHtml(result.assetClass)} / tradable: ${String(result.tradable)} / ${escapeHtml(result.source)}</small>
                        </li>
                      `
                    )
                    .join("")
            }
          </ul>
        </section>

        <section class="fixture-section" aria-label="Robinhood MCP redacted action audit summary">
          <div class="fixture-section-heading"><h3>Redacted Action Audit</h3><span>action names only</span></div>
          <ul class="audit-list fixture-list">
            ${model.actionAuditEvents
              .map(
                (event) =>
                  `<li><span>${escapeHtml(event.payload.action)}</span><small>${escapeHtml(formatDate(event.occurredAt))}</small></li>`
              )
              .join("")}
          </ul>
        </section>
      </div>
    </section>
  `;
}

function renderRobinhoodFixtureExplorer(
  model: RobinhoodFixtureExplorerModel
): string {
  const status = model.fixtureStatus;
  const account = model.accountSummary;
  const buyingPower = model.buyingPower;
  const portfolio = model.portfolioSnapshot;
  const quote = model.quoteLookup.quote;

  return `
    <section class="fixture-explorer" aria-label="Robinhood Read-Only Fixture Explorer">
      <div class="fixture-hero">
        <div>
          <p class="eyebrow">Future-readiness demo panel</p>
          <h2>Robinhood Read-Only Fixture Explorer</h2>
          <p class="status-copy">This panel uses static fixture data only. It is not a Robinhood connection, real account data, real broker data, or real market data.</p>
        </div>
        <div class="mode-stack" aria-label="Robinhood fixture status">
          <span class="badge">Fixture Only</span>
          <span class="badge">Read-Only</span>
          <span class="badge badge-danger">No Live Connection</span>
          <span class="badge badge-danger">No Order Actions</span>
        </div>
      </div>

      <section class="fixture-section" aria-label="Robinhood adapter status">
        <div class="fixture-section-heading">
          <h3>Disabled / Read-Only Status</h3>
          <span>adapter scaffold only</span>
        </div>
        <p class="empty">Default Robinhood adapter state is ${escapeHtml(model.disabledStatus.state)}. This explorer explicitly uses local fixture reads and still has no credentials, MCP transport, order review, placement, or cancel capability.</p>
        <dl class="detail-list fixture-status-list">
          <div><dt>State</dt><dd>${escapeHtml(status.state)}</dd></div>
          <div><dt>Transport</dt><dd>${escapeHtml(status.transport)}</dd></div>
          <div><dt>Requires credentials</dt><dd>${String(status.requiresCredentials)}</dd></div>
          <div><dt>Live execution available</dt><dd>${String(status.liveExecutionAvailable)}</dd></div>
          <div><dt>Order review available</dt><dd>${String(status.orderReviewAvailable)}</dd></div>
          <div><dt>Order placement available</dt><dd>${String(status.orderPlacementAvailable)}</dd></div>
          <div><dt>Cancel order available</dt><dd>${String(status.cancelOrderAvailable)}</dd></div>
          <div><dt>Credential fields required</dt><dd>${model.credentialFieldsRequired.length}</dd></div>
        </dl>
      </section>

      <section class="fixture-section" aria-label="StreetSpeak AI user education">
        <div class="fixture-section-heading">
          <h3>Mock-First Boundary</h3>
          <span>user education</span>
        </div>
        <ul class="education-list">
          ${model.education.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </section>

      <div class="fixture-grid">
        <section class="fixture-section" aria-label="Robinhood account summary fixture">
          <div class="fixture-section-heading">
            <h3>Account Summary Fixture</h3>
            <span>static fixture data only</span>
          </div>
          <p class="fixture-note">${escapeHtml(account.label)}.</p>
          <dl class="detail-list">
            <div><dt>Account label</dt><dd>${escapeHtml(account.accountLabel)}</dd></div>
            <div><dt>Account type</dt><dd>${escapeHtml(account.accountType)}</dd></div>
            <div><dt>Status</dt><dd>${escapeHtml(account.status)}</dd></div>
            <div><dt>Source</dt><dd>${escapeHtml(account.source)}</dd></div>
            <div><dt>As of</dt><dd>${escapeHtml(account.asOf)}</dd></div>
          </dl>
        </section>

        <section class="fixture-section" aria-label="Robinhood buying power fixture">
          <div class="fixture-section-heading">
            <h3>Buying Power Fixture</h3>
            <span>not real buying power</span>
          </div>
          <p class="fixture-note">${escapeHtml(buyingPower.label)}.</p>
          <dl class="detail-list">
            <div><dt>Cash available</dt><dd>${formatCurrency(buyingPower.cashAvailable)}</dd></div>
            <div><dt>Buying power</dt><dd>${formatCurrency(buyingPower.buyingPower)}</dd></div>
            <div><dt>Currency</dt><dd>${escapeHtml(buyingPower.currency)}</dd></div>
            <div><dt>Source</dt><dd>${escapeHtml(buyingPower.source)}</dd></div>
          </dl>
        </section>

        <section class="fixture-section" aria-label="Robinhood portfolio snapshot fixture">
          <div class="fixture-section-heading">
            <h3>Portfolio Snapshot Fixture</h3>
            <span>not a broker account</span>
          </div>
          <p class="fixture-note">${escapeHtml(portfolio.label)}.</p>
          <dl class="detail-list">
            <div><dt>Total equity value</dt><dd>${formatCurrency(portfolio.totalEquityValue)}</dd></div>
            <div><dt>Positions</dt><dd>${portfolio.positions.length}</dd></div>
            <div><dt>Source</dt><dd>${escapeHtml(portfolio.source)}</dd></div>
            <div><dt>As of</dt><dd>${escapeHtml(portfolio.asOf)}</dd></div>
          </dl>
        </section>

        <section class="fixture-section" aria-label="Robinhood positions fixture">
          <div class="fixture-section-heading">
            <h3>Positions Fixture</h3>
            <span>not real positions</span>
          </div>
          <ul class="position-list fixture-list">
            ${model.positions
              .map(
                (position) => `
                  <li>
                    <strong>${escapeHtml(position.symbol)}</strong>
                    <span>${position.quantity} fixture shares</span>
                    <span>${formatCurrency(position.mockMarketValue)}</span>
                    <small>${escapeHtml(position.source)} - static fixture only</small>
                  </li>
                `
              )
              .join("")}
          </ul>
        </section>

        <section class="fixture-section" aria-label="Robinhood quote lookup fixture">
          <div class="fixture-section-heading">
            <h3>Quote Lookup Fixture</h3>
            <span>not real market data</span>
          </div>
          <p class="fixture-note">${escapeHtml(quote.label)}.</p>
          <dl class="detail-list">
            <div><dt>Query</dt><dd>${escapeHtml(model.quoteLookup.query)}</dd></div>
            <div><dt>Symbol</dt><dd>${escapeHtml(quote.symbol)}</dd></div>
            <div><dt>Last</dt><dd>${formatCurrency(quote.last)}</dd></div>
            <div><dt>Bid / Ask</dt><dd>${formatCurrency(quote.bid)} / ${formatCurrency(quote.ask)}</dd></div>
            <div><dt>Source</dt><dd>${escapeHtml(quote.source)}</dd></div>
          </dl>
        </section>

        <section class="fixture-section" aria-label="Robinhood order history fixture">
          <div class="fixture-section-heading">
            <h3>Order History Fixture</h3>
            <span>not real orders</span>
          </div>
          <ul class="audit-list fixture-list">
            ${model.orderHistory
              .map(
                (order) => `
                  <li>
                    <span>${escapeHtml(order.status)} ${escapeHtml(order.side)} ${order.quantity} ${escapeHtml(order.symbol)}</span>
                    <small>${escapeHtml(order.label)}</small>
                  </li>
                `
              )
              .join("")}
          </ul>
        </section>

        <section class="fixture-section" aria-label="Robinhood tradability check fixture">
          <div class="fixture-section-heading">
            <h3>Tradability Check Fixture</h3>
            <span>not real broker availability</span>
          </div>
          <ul class="audit-list fixture-list">
            ${model.tradabilityChecks
              .map(
                (check) => `
                  <li>
                    <span>${escapeHtml(check.symbol)}: ${check.tradable ? "fixture tradable" : "not tradable in fixture"}</span>
                    <small>${escapeHtml(check.message)}</small>
                  </li>
                `
              )
              .join("")}
          </ul>
        </section>

        <section class="fixture-section" aria-label="Robinhood symbol search fixture">
          <div class="fixture-section-heading">
            <h3>Symbol Search Fixture</h3>
            <span>static symbol results only</span>
          </div>
          <p class="fixture-note">Query "${escapeHtml(model.symbolSearch.query)}" searches local fixture symbols only.</p>
          <ul class="audit-list fixture-list">
            ${model.symbolSearch.results
              .map(
                (result) => `
                  <li>
                    <span>${escapeHtml(result.symbol)} - ${escapeHtml(result.name)}</span>
                    <small>${result.tradableInFixture ? "tradable in fixture" : "not tradable in fixture"} / ${escapeHtml(result.source)}</small>
                  </li>
                `
              )
              .join("")}
          </ul>
        </section>
      </div>
    </section>
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
        ? `<p class="rejected">${escapeHtml(formatConfirmationRejection(state.confirmation.reason))}</p>`
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

function renderExportPanel(
  state: MockTradingDeskState | null,
  auditTimeline: readonly AuditEvent[],
  exportStatusMessage: string,
  receiptMarkdownPreview: string,
  storageAvailable: boolean
): string {
  const receiptDisabled = state?.status === "mock_submitted" ? "" : "disabled";
  const auditDisabled = auditTimeline.length > 0 ? "" : "disabled";

  return `
    <p class="empty">Exports are created locally from redacted browser data. They are not uploaded, shared, or turned into public URLs.</p>
    <dl class="detail-list export-status">
      <div><dt>Storage</dt><dd>${storageAvailable ? "local browser only" : "unavailable"}</dd></div>
      <div><dt>Audit events</dt><dd>${auditTimeline.length}</dd></div>
      <div><dt>Receipt statement</dt><dd>No live broker order was placed.</dd></div>
    </dl>
    <div class="settings-actions export-actions">
      <button id="copy-receipt-markdown" type="button" class="primary-button" ${receiptDisabled}>Copy receipt Markdown</button>
      <button id="download-receipt-json" type="button" class="secondary-button" ${receiptDisabled}>Download receipt JSON</button>
      <button id="download-audit-json" type="button" class="secondary-button" ${auditDisabled}>Download audit JSON</button>
      <button id="clear-audit-timeline" type="button" class="secondary-button" ${auditDisabled}>Clear audit timeline</button>
      <button id="reset-all-demo-data" type="button" class="secondary-button">Reset all local demo data</button>
    </div>
    ${
      exportStatusMessage
        ? `<p class="accepted">${escapeHtml(exportStatusMessage)}</p>`
        : ""
    }
    ${
      receiptMarkdownPreview
        ? `<textarea class="export-preview" readonly rows="10" aria-label="receipt markdown preview">${escapeHtml(receiptMarkdownPreview)}</textarea>`
        : `<p class="empty">Run a command to create a local receipt preview.</p>`
    }
  `;
}

function renderAuditTimeline(events: readonly AuditEvent[]): string {
  if (events.length === 0) {
    return `<p class="empty">No local audit events yet. Run a mock command to save redacted events in this browser.</p>`;
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

function createReceiptForCurrentState(
  state: MockTradingDeskState | null
): MockTradeReceiptExport | null {
  if (!state || state.status !== "mock_submitted") {
    return null;
  }

  return createMockTradeReceipt({
    commandTranscript: state.command.transcript,
    parsedIntent: {
      route: state.route,
      parse: state.parse
    },
    orderTicket: state.ticket ?? null,
    safetyReview: state.safetyReview ?? null,
    confirmationChallengeResult: state.challenge
      ? {
          challenge: state.challenge,
          evaluation: state.confirmation ?? null
        }
      : null,
    mockBrokerResponse: state.brokerResponse ?? null,
    auditTimeline: state.auditTimeline
  });
}

function downloadJsonFile(
  filename: string,
  payload: MockTradeReceiptExport | ReturnType<typeof exportAuditTimeline>
): void {
  const blob = new Blob([serializeAuditExport(payload)], {
    type: "application/json"
  });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

function formatConfirmationRejection(reason: string): string {
  if (reason === "generic_confirmation") {
    return "Generic confirmations such as yes, do it, confirmed, send it, execute, looks good, or okay never submit an order. Type the exact challenge phrase and unique code for a mock-only submission.";
  }

  if (reason === "phrase_mismatch") {
    return "Confirmation rejected. The full challenge phrase and unique code must match exactly before mock submission.";
  }

  if (reason === "challenge_expired") {
    return "Confirmation rejected. The challenge expired; run the mock order command again to create a new code.";
  }

  return "Confirmation rejected. Mock submission requires the exact challenge phrase and unique code.";
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
