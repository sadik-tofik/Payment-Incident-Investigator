#!/usr/bin/env node
// Usage: node run.js <1|2|3|all> [--mock] [--probes 0,5,30,75]
//   Real run needs: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET (SANDBOX app credentials)
import fs from "node:fs";
import readline from "node:readline/promises";
import { PayPal } from "./src/paypal.js";
import { startMock } from "./src/mock.js";
import { scenario1, scenario2, scenario3 } from "./scenarios/scenarios.js";

const args = process.argv.slice(2);
const which = args.find((a) => /^(1|2|3|all)$/.test(a)) ?? "all";
const mock = args.includes("--mock");
const probeArg = args[args.indexOf("--probes") + 1];
const probeMinutes = args.includes("--probes") && probeArg ? probeArg.split(",").map(Number) : [0, 5];

const calls = [];
let mockServer = null;
let base;
if (mock) {
  mockServer = await startMock();
  base = mockServer.base;
  console.log(`[MOCK MODE] ${base}. Logic check only; says nothing about real PayPal behaviour.`);
} else if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
  console.error("Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET (sandbox), or use --mock.");
  process.exit(2);
}

const pp = new PayPal({
  clientId: process.env.PAYPAL_CLIENT_ID ?? "mock",
  secret: process.env.PAYPAL_CLIENT_SECRET ?? "mock",
  base,
  log: (e) => calls.push(e),
});
pp.mockApprove = (id) => mockServer?.approve(id);

const rl = mock ? null : readline.createInterface({ input: process.stdin, output: process.stdout });
const io = {
  say: (m) => console.log(m),
  async humanStep(message, mockAction) {
    console.log("\n" + message);
    if (mock) { mockAction?.(); return; }
    await rl.question("Press Enter once done... ");
  },
};

const runners = { 1: scenario1, 2: scenario2, 3: scenario3 };
const list = which === "all" ? ["1", "2", "3"] : [which];
const results = [];
for (const k of list) {
  console.log(`\n=== Scenario ${k} ===`);
  try {
    const r = await runners[k]({ pp, io, mock, probeMinutes });
    results.push(r);
    console.log(r.pass ? "PASS" : "FAIL", r.name);
    r.findings.forEach((f) => console.log("  -", f));
  } catch (err) {
    results.push({ name: `scenario${k}`, pass: false, findings: [String(err)], evidence: {} });
    console.log("ERROR", err);
  }
}

fs.mkdirSync("results", { recursive: true });
const file = `results/${mock ? "mock-" : ""}${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(file, JSON.stringify({ mock, results, calls }, null, 2));
console.log(`\nSaved ${file} (includes PayPal debug ids for every call)`);
rl?.close();
mockServer?.close();
process.exit(results.every((r) => r.pass) ? 0 : 1);
