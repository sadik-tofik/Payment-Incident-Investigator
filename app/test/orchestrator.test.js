import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { investigate, ApiError } from "../src/orchestrator.js";
import { loadReplay, REPLAY_PLUGIN } from "../src/replay.js";
import { AuditLog } from "../src/audit.js";
import { WooCommerceReader } from "../src/wooClient.js";

const R = loadReplay();
const deps = (extra = {}) => ({ paypal: R.paypal, store: R.store, plugin: REPLAY_PLUGIN, ...extra });
const audit = () => new AuditLog(join(mkdtempSync(join(tmpdir(), "aud-")), "a.jsonl"));

test("replay order 17: confirmed identity, ok, source label shown, audit entry written and verifies", async () => {
  const a = audit();
  const inv = await investigate({ mode: "replay", paypalOrderId: "6B462964L3390141D" }, deps({ audit: a }));
  assert.equal(inv.identity.state, "confirmed"); assert.equal(inv.decision.verdict, "ok");
  assert.equal(inv.source.label, "recorded real sandbox capture");
  assert.ok(inv.evidence.some((e) => e.source === "paypal" && /^[0-9a-f]{64}$/.test(e.rawHash)));
  assert.ok(inv.limits.length > 0); assert.equal(a.verify().ok, true); assert.equal(a.verify().count, 1); assert.ok(inv.auditId);
  assert.deepEqual(inv.actions.safe.filter((x) => x.requiresApproval), []);
});

test("replay order 20: provisional association, notice shown verbatim, approved_not_captured, capture forbidden", async () => {
  const inv = await investigate({ mode: "replay", paypalOrderId: "4EL84369TC886673M" }, deps({ invoicePrefix: "dadceb" }));
  assert.equal(inv.identity.state, "provisional_association");
  assert.match(inv.identity.requiredNotice, /WooCommerce does not contain the PayPal order ID, so identity is not confirmed\.$/);
  assert.equal(inv.decision.verdict, "approved_not_captured");
  assert.ok(inv.actions.forbidden.some((x) => x.id === "capture"));
  assert.equal(inv.systems.store.holdsPayPalOrderId, false);
});

test("replay order 20 without the invoice prefix configured still resolves only if every other condition holds; wrong prefix abstains as a finding (HTTP 200 path)", async () => {
  const inv = await investigate({ mode: "replay", paypalOrderId: "4EL84369TC886673M" }, deps({ invoicePrefix: "other" }));
  assert.equal(inv.identity.state, "unresolved"); assert.equal(inv.decision.decisionStatus, "abstain");
  assert.equal(inv.decision.finding, "Unable to link this WooCommerce order to a PayPal order using the available evidence.");
});

test("secondary entry: local order 20 has no PayPal order ID -> unresolved finding with needs.paypalOrderId, not an error", async () => {
  const inv = await investigate({ mode: "replay", localOrderId: "20" }, deps());
  assert.equal(inv.identity.state, "unresolved"); assert.equal(inv.identity.reason, "store_has_no_paypal_order_id"); assert.equal(inv.needs.paypalOrderId, true);
  assert.equal(inv.decision.verdict, "unknown"); assert.equal(inv.systems.paypal, null);
});

test("input validation happens before any read", async () => {
  let called = 0; const spy = { getOrder: async () => { called++; }, };
  for (const body of [{ mode: "replay", paypalOrderId: "bad id!" }, { mode: "nope", paypalOrderId: "6B462964L3390141D" }, { mode: "replay" }, { mode: "replay", localOrderId: "x" }])
    await assert.rejects(investigate(body, deps({ paypal: spy })), (e) => e instanceof ApiError && e.status === 400);
  assert.equal(called, 0);
});

test("unknown PayPal order -> 404; unreadable PayPal -> 502 (not a completed investigation); auth rejected -> 502 upstream_auth_rejected", async () => {
  await assert.rejects(investigate({ mode: "replay", paypalOrderId: "ZZZZZZZZZZZZ" }, deps()), (e) => e.status === 404 && e.code === "paypal_order_not_found");
  const mk = (err) => ({ getOrder: async () => ({ unreadable: true, readError: err, retrievedAt: "t" }) });
  await assert.rejects(investigate({ mode: "live", paypalOrderId: "6B462964L3390141D" }, deps({ paypal: mk("HTTP 500") })), (e) => e.status === 502 && e.code === "upstream_unreachable");
  await assert.rejects(investigate({ mode: "live", paypalOrderId: "6B462964L3390141D" }, deps({ paypal: mk("HTTP 401") })), (e) => e.code === "upstream_auth_rejected");
  await assert.rejects(investigate({ mode: "live", paypalOrderId: "6B462964L3390141D" }, deps({ paypal: mk("HTTP 200 x") })), (e) => e.code === "upstream_bad_response");
});

test("unreadable store -> 502 with partial; failure is audited; no verdict in partial", async () => {
  const a = audit();
  const store = { getOrderByLocalId: async () => ({ unreadable: true, readError: "network:TimeoutError", retrievedAt: "t" }) };
  await assert.rejects(investigate({ mode: "live", paypalOrderId: "6B462964L3390141D" }, deps({ store, audit: a })), (e) => { assert.equal(e.status, 502); assert.equal(e.partial.system, "store"); assert.equal(e.partial.verdict, undefined); assert.ok(e.auditId); return true; });
  assert.equal(a.read()[0].type, "investigation_failed");
});

test("deadline: slow reader -> 504 deadline_exceeded", async () => {
  const slow = { getOrder: () => new Promise(() => {}) };
  await assert.rejects(investigate({ mode: "live", paypalOrderId: "6B462964L3390141D" }, deps({ paypal: slow, deadlineMs: 30 })), (e) => e.status === 504 && e.code === "deadline_exceeded");
});

test("unsupported plugin version is a finding (unresolved), never a confirmed link", async () => {
  const store = { getOrderByLocalId: (id) => R.store.getOrderByLocalId(id).then((l) => ({ ...l, pluginVersion: "9.9.9" })) };
  const inv = await investigate({ mode: "replay", paypalOrderId: "6B462964L3390141D" }, deps({ store }));
  assert.equal(inv.identity.state, "unresolved"); assert.equal(inv.identity.reason, "plugin_version_not_recorded");
});

test("WooCommerceReader: GET only, https required, no redirects, bad id never fetched, 401 is unreadable", async () => {
  assert.throws(() => new WooCommerceReader({ baseUrl: "http://example.com", key: "k", secret: "s" }));
  const calls = [];
  const f = (status, body) => async (url, init) => { calls.push({ url, init }); return { status, ok: status >= 200 && status < 300, text: async () => body }; };
  const mk = (fi) => new WooCommerceReader({ baseUrl: "https://shop.test", key: "k", secret: "s", pluginVersion: "4.2.0", fetchImpl: fi });
  const bad = await mk(f(200, "{}")).getOrderByLocalId("1/../2"); assert.equal(bad.readError, "invalid_local_order_id"); assert.equal(calls.length, 0);
  assert.equal((await mk(f(401, "{}")).getOrderByLocalId("5")).readError, "HTTP 401");
  assert.match((await mk(f(302, "")).getOrderByLocalId("5")).readError, /redirect refused/);
  const ok = await mk(f(200, JSON.stringify({ id: 5, status: "pending", total: "1.00", currency: "USD", billing: { email: "x@y.z" }, meta_data: [] }))).getOrderByLocalId("5");
  assert.equal(ok.localOrderId, "5"); assert.doesNotMatch(JSON.stringify(ok), /x@y\.z/);
  assert.ok(calls.every((c) => c.init.method === "GET" && c.init.redirect === "manual"));
  assert.equal(typeof mk(f(200, "{}")).update, "undefined");
});

test("localhost http uses OAuth1 query params, never Basic", async () => {
  let seen; const fi = async (url, init) => { seen = { url, init }; return { status: 404, ok: false, text: async () => "{}" }; };
  await new WooCommerceReader({ baseUrl: "http://localhost:8080/wordpress", key: "k", secret: "s", fetchImpl: fi }).getOrderByLocalId("7");
  assert.match(seen.url, /^http:\/\/localhost:8080\/wordpress\/wp-json\/wc\/v3\/orders\/7\?oauth_consumer_key=k/); assert.match(seen.url, /oauth_signature=/); assert.equal(seen.init.headers.Authorization, undefined);
});

import { buildVersion, HASH_SPEC } from "../src/orchestrator.js";
import { PayPalReader } from "../src/paypalClient.js";
import { createServer } from "node:http";
import { TestPayPalReader } from "./helpers.js";

test("v0.4: safe actions are humanActionOnly, never carry requiresApproval; forbidden actions have id+reason+rule; integrity block says no authenticity", async () => {
  const inv = await investigate({ mode: "replay", paypalOrderId: "4EL84369TC886673M" }, deps({ invoicePrefix: "dadceb" }));
  for (const a of inv.actions.safe) { assert.equal(a.humanActionOnly, true); assert.equal("requiresApproval" in a, false); }
  for (const a of inv.actions.forbidden) assert.ok(a.id && a.reason && a.rule);
  assert.equal(inv.integrity.establishesAuthenticity, false); assert.equal(HASH_SPEC.establishesAuthenticity, false);
});

test("v0.4: build version comes from package.json, not a literal", () => { assert.match(buildVersion(), /^\d+\.\d+\.\d+$/); });

test("v0.4: both IDs given: store order comes from localOrderId; mismatched pair is a finding (ids_disagree or unresolved), never confirmed", async () => {
  const inv = await investigate({ mode: "replay", paypalOrderId: "6B462964L3390141D", localOrderId: "13" }, deps());
  assert.notEqual(inv.identity.state, "confirmed"); assert.equal(inv.decision.decisionStatus, "abstain");
});

test("v0.4: 404 rules. PayPal body RESOURCE_NOT_FOUND -> 404 + audited; bare 404 -> 502 upstream_bad_response; store ORDER_NOT_FOUND -> 404 store_order_not_found", async () => {
  const a = audit();
  await assert.rejects(investigate({ mode: "replay", paypalOrderId: "ZZZZZZZZZZZZ" }, deps({ audit: a })), (e) => e.code === "paypal_order_not_found" && Boolean(e.auditId));
  const bare = { getOrder: async () => ({ unreadable: true, readError: "HTTP 404", retrievedAt: "t" }) };
  await assert.rejects(investigate({ mode: "live", paypalOrderId: "6B462964L3390141D" }, deps({ paypal: bare })), (e) => e.status === 502 && e.code === "upstream_bad_response");
  await assert.rejects(investigate({ mode: "replay", localOrderId: "99999" }, deps()), (e) => e.status === 404 && e.code === "store_order_not_found");
});

test("v0.4: PayPalReader distinguishes PayPal's own not-found body from a bare 404", async () => {
  for (const [body, want] of [[{ name: "RESOURCE_NOT_FOUND" }, "HTTP 404 RESOURCE_NOT_FOUND"], [{ message: "nope" }, "HTTP 404"]]) {
    const srv = createServer((q, r) => { if (q.url.includes("oauth2/token")) { r.setHeader("content-type", "application/json"); r.end(JSON.stringify({ access_token: "t" })); } else { r.statusCode = 404; r.end(JSON.stringify(body)); } });
    await new Promise((res) => srv.listen(0, "127.0.0.1", res));
    try {
      const rd = new TestPayPalReader({ clientId: "a", secret: "b", base: `http://127.0.0.1:${srv.address().port}`, allowedHosts: [`127.0.0.1:${srv.address().port}`], retries: 1 });
      assert.equal((await rd.getOrder("ABC")).readError, want);
    } finally { srv.close(); }
  }
});

test("v0.4: replay case list for the UI exposes no PayPal order IDs; caseToInput resolves server-side", () => {
  assert.doesNotMatch(JSON.stringify(R.publicCases()), /[A-Z0-9]{14,}/);
  assert.equal(R.caseToInput("replay-order-20").paypalOrderId, "4EL84369TC886673M"); assert.equal(R.caseToInput("nope"), null);
});

import { prepareInput } from "../src/orchestrator.js";
import { stateFingerprint } from "../src/fingerprint.js";
import { diagnose } from "../src/engine.js";
import { resolveIdentity } from "../src/identity.js";

test("v0.5 / CR-004: each identity- or decision-relevant field changes the fingerprint on its own (same verdict, same match)", async () => {
  const pp = await R.paypal.getOrder("4EL84369TC886673M"); const lo = await R.store.getOrderByLocalId("20");
  const m = resolveIdentity(pp, lo, { invoicePrefix: "dadceb" }); assert.equal(m.identity, "provisional");
  const f0 = stateFingerprint(pp, lo, "approved_not_captured", m);
  for (const [k, v] of [["customId", "21"], ["invoiceId", "dadceb-21"], ["purchaseUnitCount", 2], ["unitAmount", "21.00"], ["unitCurrency", "EUR"]])
    assert.notEqual(stateFingerprint({ ...pp, [k]: v }, lo, "approved_not_captured", m), f0, `paypal.${k}`);
  for (const [k, v] of [["pluginVersion", "4.3.0"], ["pluginName", "other"]]) assert.notEqual(stateFingerprint(pp, { ...lo, [k]: v }, "approved_not_captured", m), f0, `local.${k}`);
  assert.notEqual(stateFingerprint(pp, lo, "approved_not_captured", { ...m, identity: "unresolved", reason: "x" }), f0, "identity state");
  assert.notEqual(stateFingerprint(pp, lo, "approved_not_captured", { ...m, reason: "y" }), f0, "identity reason");
  assert.equal(stateFingerprint({ ...pp, retrievedAt: "later", rawSha256: "z" }, { ...lo, retrievedAt: "later", rawSha256: "z" }, "approved_not_captured", m), f0, "still excludes retrievedAt and raw");
  // end to end: the engine's own fingerprint moves when invoice id changes under provisional identity
  const e0 = diagnose({ paypal: pp, local: lo, match: m }).stateFingerprint;
  assert.notEqual(diagnose({ paypal: { ...pp, invoiceId: "dadceb-21" }, local: lo, match: resolveIdentity({ ...pp, invoiceId: "dadceb-21" }, lo, { invoicePrefix: "dadceb" }) }).stateFingerprint, e0);
});

test("v0.5: caseId is exclusive and mode-bound", () => {
  const cases = { replay: R.caseToInput };
  for (const body of [
    { mode: "replay", caseId: "replay-order-20", paypalOrderId: "DIFFERENTORDER123" },
    { mode: "replay", caseId: "replay-order-20", localOrderId: "20" },
    { mode: "live", caseId: "replay-order-20" },
    null, { mode: "nope" },
  ]) assert.throws(() => prepareInput(body, cases), (e) => e.status === 400 && e.code === "invalid_body", JSON.stringify(body));
  assert.throws(() => prepareInput({ mode: "replay", caseId: "nope" }, cases), (e) => e.code === "unknown_case");
  assert.throws(() => prepareInput({ mode: "injected", caseId: "replay-order-20" }, cases), (e) => e.code === "unknown_case");
  assert.deepEqual(prepareInput({ mode: "replay", caseId: "replay-order-20" }, cases), { mode: "replay", paypalOrderId: "4EL84369TC886673M", invoicePrefix: "dadceb" });
  assert.deepEqual(prepareInput({ mode: "live", paypalOrderId: "ABCDEFGHIJ" }), { mode: "live", paypalOrderId: "ABCDEFGHIJ", localOrderId: undefined });
});

test("CR-004 v2: a change inside ANY purchase unit moves the fingerprint (units keep identifiers tied to their own amounts/captures)", async () => {
  const { toPayPalFacts } = await import("../src/paypalClient.js");
  const mk = (u2) => toPayPalFacts({ id: "ORD1234567", status: "APPROVED", purchase_units: [{ custom_id: "1", invoice_id: "p-1", amount: { value: "5.00", currency_code: "USD" } }, u2] }, "t", "h");
  const base = { custom_id: "2", invoice_id: "p-2", amount: { value: "6.00", currency_code: "USD" } };
  const lo = { localOrderId: "1", normalizedStatus: "unpaid", total: "5.00", currency: "USD", paypalOrderIdRef: null, paypalOrderIdRefCount: 0, pluginName: "x", pluginVersion: "1" };
  const m = { identity: "unresolved", reason: "paypal_purchase_unit_count_not_one" };
  const f0 = stateFingerprint(mk(base), lo, "unknown", m);
  for (const patch of [{ custom_id: "3" }, { invoice_id: "p-3" }, { amount: { value: "7.00", currency_code: "USD" } }, { amount: { value: "6.00", currency_code: "EUR" } }])
    assert.notEqual(stateFingerprint(mk({ ...base, ...patch }), lo, "unknown", m), f0, JSON.stringify(patch));
  assert.notEqual(stateFingerprint(mk(base), { ...lo, paypalOrderIdRefCount: 2 }, "unknown", m), f0, "ref count");
});

test("custom_id handling: present but not a 1-12 digit order number -> unresolved finding, NO store request made", async () => {
  let storeCalls = 0;
  const pp = { getOrder: async () => ({ ...(await R.paypal.getOrder("4EL84369TC886673M")), customId: "inc1-1793348074231" }) };
  const store = { getOrderByLocalId: async () => { storeCalls++; return { unreadable: true, readError: "x" }; } };
  const inv = await investigate({ mode: "live", paypalOrderId: "4EL84369TC886673M" }, deps({ paypal: pp, store }));
  assert.equal(storeCalls, 0); assert.equal(inv.identity.state, "unresolved"); assert.equal(inv.identity.reason, "paypal_custom_id_missing"); assert.equal(inv.systems.store, null);
});

import { readFileSync, readdirSync, mkdtempSync as mkd } from "node:fs";
import { reproduce } from "../../scripts/reproduce.mjs";
import { sha256 } from "../src/canonical.js";

test("evidence: identity evidence shows WHY each identity state was reached (store ref, PayPal ids, custom_id, invoice_id, amount)", async () => {
  const c = await investigate({ mode: "replay", paypalOrderId: "6B462964L3390141D" }, deps());
  const f = (inv, src, field) => inv.evidence.find((e) => e.source === src && e.field === field)?.value;
  assert.equal(f(c, "store", "paypalOrderIdRef"), "6B462964L3390141D"); assert.equal(f(c, "paypal", "paypalOrderId"), "6B462964L3390141D"); assert.ok(f(c, "paypal", "customId"));
  const p = await investigate({ mode: "replay", paypalOrderId: "4EL84369TC886673M" }, deps({ invoicePrefix: "dadceb" }));
  assert.equal(f(p, "store", "paypalOrderIdRef"), null); assert.equal(f(p, "paypal", "customId"), "20"); assert.equal(f(p, "paypal", "invoiceId"), "dadceb-20"); assert.equal(f(p, "paypal", "unitAmount"), "20.00:USD"); assert.equal(f(p, "store", "plugin"), "woocommerce-paypal-payments@4.2.0");
  for (const inv of [c, p]) for (const e of inv.evidence.filter((x) => x.source !== "engine")) assert.ok(e.observedAt && e.rawHash, `${e.field} has provenance`);
});

test("reproducibility: every replay/injected investigation's stored bundle re-runs to the same verdict, fingerprint and evidence; a doctored bundle is caught", async () => {
  const dir = mkd(join(tmpdir(), "bun-")); const a = audit();
  for (const pid of ["6B462964L3390141D", "2VN877005K8093717", "4EL84369TC886673M"]) await investigate({ mode: "replay", paypalOrderId: pid }, deps({ bundleDir: dir, audit: a, invoicePrefix: "dadceb" }));
  const files = readdirSync(dir); assert.equal(files.length, 3);
  for (const f of files) { const t = readFileSync(join(dir, f), "utf8"); const r = reproduce(JSON.parse(t)); assert.equal(r.ok, true, f); assert.ok(a.read().some((x) => x.data.bundleSha256 === sha256(t)), "audit entry carries the bundle hash"); }
  const b = JSON.parse(readFileSync(join(dir, files[0]), "utf8")); b.inputs.local.normalizedStatus = b.inputs.local.normalizedStatus === "paid" ? "unpaid" : "paid";
  assert.equal(reproduce(b).ok, false);
});

test("reproduce: a bundle missing ANY required expected field, inputs or engineOptions FAILS; unknown spec fails; extra keys cannot hide a missing one", async () => {
  const { REQUIRED_EXPECTED } = await import("../../scripts/reproduce.mjs");
  const dir = mkd(join(tmpdir(), "bun2-"));
  await investigate({ mode: "replay", paypalOrderId: "6B462964L3390141D" }, deps({ bundleDir: dir }));
  const good = JSON.parse(readFileSync(join(dir, readdirSync(dir)[0]), "utf8")); assert.equal(reproduce(good).ok, true);
  for (const k of REQUIRED_EXPECTED) { const b = structuredClone(good); delete b.expected[k]; const r = reproduce(b); assert.equal(r.ok, false, k); assert.ok(r.problems.includes(`expected_missing:${k}`), k); }
  const b2 = structuredClone(good); b2.expected = { junk: 1 }; assert.equal(reproduce(b2).ok, false);
  for (const k of ["inputs", "engineOptions"]) { const b = structuredClone(good); delete b[k]; assert.equal(reproduce(b).ok, false, k); }
  assert.equal(reproduce({ ...good, bundleSpec: "x" }).ok, false);
});
