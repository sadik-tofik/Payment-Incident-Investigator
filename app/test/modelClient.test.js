import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createModelFn, modelFnFromEnv, PROMPT_VERSION } from "../src/modelClient.js";
import { investigate } from "../src/orchestrator.js";
import { loadReplay, REPLAY_PLUGIN } from "../src/replay.js";
import { AuditLog } from "../src/audit.js";

const KEY = "FAKE-TEST-VALUE-key-123456789";
const R = loadReplay();
const base = (extra = {}) => ({ paypal: R.paypal, store: R.store, plugin: REPLAY_PLUGIN, ...extra });
const okStatement = (ids) => ({ summary: "s", abstained: false, statements: [{ text: "PayPal shows a completed capture and the store shows the order as paid.", evidenceIds: ids }] });
// fake provider responses that echo any evidence IDs they were given
function fakeFetch(provider, make, log = []) {
  return async (url, init) => {
    log.push({ url, init });
    const input = JSON.parse(provider === "gemini" ? JSON.parse(init.body).contents[0].parts[0].text : JSON.parse(init.body).messages[1].content);
    const content = JSON.stringify(make(input.evidence.map((e) => e.evidenceId)));
    const body = provider === "gemini" ? { candidates: [{ content: { parts: [{ text: content }] } }] } : { choices: [{ message: { content: "```json\n" + content + "\n```" } }] };
    return { ok: true, status: 200, json: async () => body };
  };
}

test("model client: Gemini request goes only to the fixed Google host, key in header only, JSON mode, no tools", async () => {
  const log = []; const fn = createModelFn({ provider: "gemini", model: "gemini-3.8-flash", apiKey: KEY, fetchImpl: fakeFetch("gemini", okStatement, log) });
  const out = await fn({ verdict: "ok", evidence: [{ evidenceId: "EV-0001" }] });
  assert.equal(out.statements[0].evidenceIds[0], "EV-0001");
  const { url, init } = log[0];
  assert.equal(new URL(url).hostname, "generativelanguage.googleapis.com");
  assert.ok(url.includes("gemini-3.8-flash:generateContent"));
  assert.ok(!url.includes(KEY) && !init.body.includes(KEY));
  assert.equal(init.headers["x-goog-api-key"], KEY);
  const b = JSON.parse(init.body);
  assert.equal(b.generationConfig.responseMimeType, "application/json"); assert.equal(b.generationConfig.temperature, 0);
  assert.equal(b.tools, undefined); assert.equal(init.redirect, "error");
});
test("model client: NVIDIA (OpenAI-compatible) request goes only to the fixed NVIDIA host with a Bearer key; fenced JSON is parsed", async () => {
  const log = []; const fn = createModelFn({ provider: "nvidia", model: "some-vendor/some-model", apiKey: KEY, fetchImpl: fakeFetch("nvidia", okStatement, log) });
  const out = await fn({ verdict: "ok", evidence: [{ evidenceId: "EV-0001" }] });
  assert.equal(out.abstained, false);
  assert.equal(new URL(log[0].url).hostname, "integrate.api.nvidia.com");
  assert.equal(log[0].init.headers.authorization, `Bearer ${KEY}`);
  assert.ok(!log[0].init.body.includes(KEY)); assert.equal(JSON.parse(log[0].init.body).tools, undefined);
});
test("model client: refuses unknown provider, bad model id, missing key; off unless AI_ENABLED=1 and everything is set", () => {
  assert.throws(() => createModelFn({ provider: "x", model: "m1", apiKey: KEY }), /unknown_provider/);
  assert.throws(() => createModelFn({ provider: "gemini", model: "bad model;rm", apiKey: KEY }), /invalid_model_id/);
  assert.throws(() => createModelFn({ provider: "gemini", model: "gemini-3.8-flash" }), /missing_api_key/);
  assert.equal(modelFnFromEnv({}), null);
  assert.equal(modelFnFromEnv({ AI_ENABLED: "0", AI_PROVIDER: "gemini", AI_MODEL: "m1", GEMINI_API_KEY: KEY }), null);
  assert.throws(() => modelFnFromEnv({ AI_ENABLED: "1", AI_PROVIDER: "gemini", AI_MODEL: "gemini-3.8-flash" }), /missing_api_key/);
  const fn = modelFnFromEnv({ AI_ENABLED: "1", AI_PROVIDER: "nvidia", AI_MODEL: "vendor/m", NVIDIA_API_KEY: KEY });
  assert.deepEqual({ ...fn.info }, { provider: "nvidia", model: "vendor/m", promptVersion: PROMPT_VERSION });
});
test("model client: hard call budget, non-200 and invalid JSON all throw without leaking the key", async () => {
  const f200 = fakeFetch("gemini", okStatement);
  const fn = createModelFn({ provider: "gemini", model: "m1", apiKey: KEY, maxCalls: 2, fetchImpl: f200 });
  await fn({ evidence: [{ evidenceId: "EV-0001" }] }); await fn({ evidence: [{ evidenceId: "EV-0001" }] });
  await assert.rejects(() => fn({ evidence: [] }), /call_budget_exhausted/); assert.equal(fn.callsUsed(), 2);
  const bad = createModelFn({ provider: "gemini", model: "m1", apiKey: KEY, fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({}) }) });
  await assert.rejects(() => bad({}), (e) => e.message === "provider_http_429" && !e.message.includes(KEY));
  const junk = createModelFn({ provider: "gemini", model: "m1", apiKey: KEY, fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: "not json" }] } }] }) }) });
  await assert.rejects(() => junk({}));
});
test("model client: a request that hangs is aborted at the timeout", async () => {
  const fn = createModelFn({ provider: "gemini", model: "m1", apiKey: KEY, timeoutMs: 20, fetchImpl: (u, init) => new Promise((_, rej) => init.signal.addEventListener("abort", () => rej(new Error("aborted")))) });
  await assert.rejects(() => fn({}), /timeout/);
});
test("model client end to end: valid grounded text is accepted, model info is audited, the verdict is unchanged", async () => {
  const au = new AuditLog(join(mkdtempSync(join(tmpdir(), "ai-")), "a.jsonl"));
  const fn = createModelFn({ provider: "gemini", model: "gemini-3.8-flash", apiKey: KEY, fetchImpl: fakeFetch("gemini", okStatement) });
  const plain = await investigate({ mode: "replay", paypalOrderId: "4EL84369TC886673M" }, base({}));
  const inv = await investigate({ mode: "replay", paypalOrderId: "4EL84369TC886673M" }, base({ explainFn: fn, audit: au }));
  assert.equal(inv.explanation.kind, "ai_validated"); assert.equal(inv.explanation.aiStatus, "accepted");
  assert.equal(inv.decision.verdict, plain.decision.verdict); assert.equal(inv.decision.stateFingerprint ?? null, plain.decision.stateFingerprint ?? null);
  const line = JSON.parse(readFileSync(au.path, "utf8").trim().split("\n").pop());
  assert.equal(line.data.ai.status, "accepted"); assert.equal(line.data.ai.model.model, "gemini-3.8-flash"); assert.equal(line.data.ai.model.promptVersion, PROMPT_VERSION);
  assert.ok(!JSON.stringify(line).includes(KEY));
});
test("model client end to end: ungrounded values, invented evidence IDs and forbidden words are rejected and the template is shown", async () => {
  for (const make of [
    (ids) => ({ summary: "s", abstained: false, statements: [{ text: "The capture of 999.99 completed.", evidenceIds: ids }] }),
    () => ({ summary: "s", abstained: false, statements: [{ text: "PayPal shows a completed capture.", evidenceIds: ["EV-9999"] }] }),
    (ids) => ({ summary: "s", abstained: false, statements: [{ text: "This guarantees the root cause is found.", evidenceIds: ids }] }),
    () => ({ nonsense: true }),
  ]) {
    const fn = createModelFn({ provider: "nvidia", model: "v/m", apiKey: KEY, fetchImpl: fakeFetch("nvidia", make) });
    const inv = await investigate({ mode: "replay", paypalOrderId: "4EL84369TC886673M" }, base({ explainFn: fn }));
    assert.equal(inv.explanation.kind, "template"); assert.equal(inv.explanation.aiStatus, "rejected"); assert.equal(inv.explanation.aiRejected, true);
  }
});
test("model client end to end: a failing provider falls back to the template and the investigation still succeeds", async () => {
  const fn = createModelFn({ provider: "gemini", model: "m1", apiKey: KEY, fetchImpl: async () => { throw new Error("network down"); } });
  const inv = await investigate({ mode: "replay", paypalOrderId: "4EL84369TC886673M" }, base({ explainFn: fn }));
  assert.equal(inv.explanation.kind, "template"); assert.equal(inv.explanation.aiStatus, "error");
});
test("model client: the model receives only the structured engine output (no raw bodies, no buyer fields)", async () => {
  let seen; const fn = createModelFn({ provider: "gemini", model: "m1", apiKey: KEY, fetchImpl: async (u, init) => { seen = init.body; return { ok: false, status: 500, json: async () => ({}) }; } });
  await investigate({ mode: "replay", paypalOrderId: "4EL84369TC886673M" }, base({ explainFn: fn }));
  const sent = JSON.parse(JSON.parse(seen).contents[0].parts[0].text);
  assert.deepEqual(Object.keys(sent).sort(), ["decisionStatus", "divergencePoint", "evidence", "forbiddenActions", "reason", "safeActions", "verdict"]);
  assert.ok(!/@|payer|email|address|name/i.test(JSON.stringify(sent.evidence.map((e) => e.field))));
});
