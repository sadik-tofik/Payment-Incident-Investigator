// Builds the UI example responses by calling the REAL HTTP server. Used by scripts/gen-ui-fixtures.mjs (writes) and
// app/test/server.test.js (checks the files on disk have not drifted from what the server returns).
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../app/src/server.js";
import { loadReplay, REPLAY_PLUGIN } from "../app/src/replay.js";

const R = loadReplay();
const T = "2026-11-01T11:00:00Z";
const fail = (readError) => async () => ({ unreadable: true, readError, retrievedAt: T });
const failing = (o) => ({ replay: { ...R, plugin: REPLAY_PLUGIN, ...o } });

const DEFS = {
  "health.json": { get: "/health" },
  "cases.json": { get: "/cases" },
  "investigation-confirmed-ok.json": { post: { mode: "replay", paypalOrderId: "6B462964L3390141D" } },
  "investigation-provisional-approved-not-captured.json": { post: { mode: "replay", caseId: "replay-order-20" } },
  "investigation-unresolved-needs-paypal-id.json": { post: { mode: "replay", localOrderId: "20" } },
  "investigation-abstain-link-unresolved.json": { post: { mode: "replay", paypalOrderId: "6B462964L3390141D", localOrderId: "13" } },
  "investigation-injected-captured-local-unpaid.json": { post: { mode: "injected", caseId: "injected-captured-local-unpaid" } },
  "investigation-injected-amount-mismatch.json": { post: { mode: "injected", caseId: "injected-amount-mismatch" } },
  "investigation-injected-multiple-captures.json": { post: { mode: "injected", caseId: "injected-multiple-captures" } },
  "error-400-invalid-order-id.json": { post: { mode: "replay", paypalOrderId: "bad id" } },
  "error-400-case-combined-with-order-id.json": { post: { mode: "replay", caseId: "replay-order-20", paypalOrderId: "DIFFERENTORDER123" } },
  "error-403-live-not-enabled.json": { post: { mode: "live", paypalOrderId: "ABCDEFGHIJ" } },
  "error-404-paypal-order-not-found.json": { post: { mode: "replay", paypalOrderId: "ZZZZZZZZZZZZ" } },
  "error-404-store-order-not-found.json": { post: { mode: "replay", localOrderId: "99999" } },
  "error-502-upstream-unreachable.json": { post: { mode: "replay", paypalOrderId: "ABCDEFGHIJ" }, sources: failing({ paypal: { getOrder: fail("HTTP 500") } }) },
  "error-502-upstream-auth-rejected.json": { post: { mode: "replay", paypalOrderId: "6B462964L3390141D" }, sources: failing({ store: { getOrderByLocalId: fail("HTTP 401") } }) },
  "error-504-deadline-exceeded.json": { post: { mode: "replay", paypalOrderId: "ABCDEFGHIJ" }, sources: failing({ paypal: { getOrder: () => new Promise(() => {}) } }), deadlineMs: 20 },
};
export const FIXTURE_NAMES = Object.keys(DEFS);

const norm = (b) => {
  if (b && typeof b === "object" && !Array.isArray(b)) {
    if (b.id?.startsWith?.("inv_")) b.id = "inv_EXAMPLE";
    if (b.createdAt) b.createdAt = "2026-11-04T00:00:00.000Z";
    if (b.auditId) b.auditId = "EXAMPLE";
    if (b.build) b.build = "<package.json version>";
    if (b.partial?.retrievedAt) b.partial.retrievedAt = "2026-11-04T00:00:00.000Z";
  }
  return b;
};

export async function buildFixtures() {
  const out = {};
  for (const [name, d] of Object.entries(DEFS)) {
    const { server } = createApp({ auditPath: join(mkdtempSync(join(tmpdir(), "fx-")), "a.jsonl"), sources: d.sources, deadlineMs: d.deadlineMs, now: () => new Date("2026-11-04T00:00:00Z") });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    try {
      const url = `http://127.0.0.1:${server.address().port}/api/v1${d.get ?? "/investigations"}`;
      const res = await fetch(url, d.post ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(d.post) } : {});
      out[name] = { httpStatus: res.status, body: norm(await res.json()) };
    } finally { server.close(); }
  }
  return out;
}
