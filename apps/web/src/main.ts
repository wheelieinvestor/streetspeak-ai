import { createMockSession } from "@streetspeak-ai/core";
import "./styles.css";

const session = createMockSession();

const app = document.querySelector<HTMLElement>("#app");

if (app) {
  app.innerHTML = `
    <section class="shell">
      <p class="eyebrow">StreetSpeak AI</p>
      <h1>Voice-native trading desk for AI agents.</h1>
      <p class="lede">
        A local-first workspace for self-directed investors to ask questions,
        build mock order tickets, review risk, and confirm actions intentionally.
      </p>
      <div class="status">
        <span>Mode</span>
        <strong>${session.mode}</strong>
      </div>
      <p class="note">Mock mode coming next. Live broker execution is not implemented.</p>
    </section>
  `;
}
