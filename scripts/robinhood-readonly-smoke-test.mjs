#!/usr/bin/env node
/* global console, process */

import { runRobinhoodMcpReadOnlySmokeTest } from "../packages/brokers/dist/index.js";

const modulePath = process.env.STREETSPEAK_ROBINHOOD_MCP_CLIENT_MODULE;
let client;

if (modulePath) {
  const mod = await import(modulePath);
  client = mod.default ?? mod.client ?? mod.robinhoodMcpReadOnlyClient;
}

const summary = await runRobinhoodMcpReadOnlySmokeTest({ client });

for (const line of summary.lines) {
  console.log(line);
}

console.log(`status: ${summary.status}`);
console.log("raw payload included: false");
console.log("live execution available: false");
console.log("order review available: false");
console.log("order placement available: false");
console.log("cancel order available: false");

if (!client) {
  console.log(
    "MCP unavailable/unconfigured: provide an externally managed local client module via STREETSPEAK_ROBINHOOD_MCP_CLIENT_MODULE to run live read-only smoke checks."
  );
}
