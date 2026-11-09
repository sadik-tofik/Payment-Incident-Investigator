import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AuditLog } from "../src/audit.js";
import { redact, redactString } from "../src/redact.js";
import { RequestJournal } from "../src/requestJournal.js";
import { PayPalReader, HostRefused, RedirectRefused, toPayPalFacts } from "../src/paypalClient.js";
import { TestPayPalReader } from "./helpers.js";

const dir = () => mkdtempSync(join(tmpdir(), "pii-"));

test("SR-F-40/41: audit chain verifies, and any modification, deletion or reorder is detected", () => {
  const p = join(dir(), "audit.jsonl");
  const a = new AuditLog(p);
  for (let i = 0; i < 5; i++) a.append("investigation", { i });
  assert.deepEqual({ ok: true, count: 5 }, (({ ok, count }) => ({ ok, count }))(a.verify()));
  const lines = readFileSync(p, "utf8").split("\n").filter(Boolean);
  const mod = lines.map((l, i) => (i === 2 ? l.replace('"i":2', '"i":99') : l));
  writeFileSync(p, mod.join("\n") + "\n");
  const v = new AuditLog(p).verify(); assert.equal(v.ok, false); assert.equal(v.brokenAt, 3);
  writeFileSync(p, lines.filter((_, i) => i !== 1).join("\n") + "\n");
  assert.equal(new AuditLog(p).verify().ok, false);
  writeFileSync(p, [lines[0], lines[2], lines[1], lines[3], lines[4]].join("\n") + "\n");
  assert.equal(new AuditLog(p).verify().ok, false);
});

test("SR-F-42 limit is real: rewriting the whole chain consistently is NOT detected (documented, not claimed away)", () => {
  const p = join(dir(), "a.jsonl"); const a = new AuditLog(p); a.append("x", { v: 1 }); a.append("x", { v: 2 });
  const p2 = join(dir(), "b.jsonl"); const b = new AuditLog(p2); b.append("x", { v: 1 }); b.append("x", { v: 3 });
  assert.equal(b.verify().ok, true);
  assert.notEqual(a.verify().head, b.verify().head); // only an externally kept head hash would reveal the swap
});

test("audit module exposes no update or delete", () => {
  const names = Object.getOwnPropertyNames(AuditLog.prototype);
  assert.deepEqual(names.sort(), ["append", "constructor", "read", "verify"]);
});

test("SR-N-12 / ST-10: seeded personal data and tokens do not survive redaction", () => {
  const seeded = { payer: { name: { given_name: "Jane", surname: "Doe" }, email_address: "jane.doe@example.com", address: { address_line_1: "1 Main St" } }, note: "call +1 (555) 123-4567 or jane@example.com", access_token: "A21AAKexampleexampleexampleexampleexampleexampleexample", log: "Authorization: Bearer abc.def.ghi", id: "5LV75741Y0902515G", when: "2026-10-30T09:04:55Z" };  // FAKE-TEST-VALUE: deliberately fake, used to prove redaction
  const out = JSON.stringify(redact(seeded));
  for (const leak of ["Jane", "Doe", "jane", "1 Main St", "555", "A21AAK", "abc.def.ghi"]) assert.ok(!out.includes(leak), leak);
  assert.ok(out.includes("5LV75741Y0902515G") && out.includes("2026-10-30T09:04:55Z"));
  assert.equal(redactString("x@y.io"), "[email]");
});

test("ST-12 / SR-F-50: crash after persist and before send leaves a recoverable ID; retry reuses the SAME id", async () => {
  const j = new RequestJournal(join(dir(), "req.jsonl"));
  const sent = [];
  const first = await j.run("create-A", async (id) => { sent.push(id); throw new Error("connection lost"); });
  assert.equal(first.unresolved, true);
  assert.equal(j.assess("create-A").status, "unresolved");
  const retry = await j.retryUnresolved(async (id) => { sent.push(id); return { order: "O1" }; });
  assert.equal(retry.length, 1);
  assert.equal(new Set(sent).size, 1, "retry must reuse the stored ID");
  assert.equal(j.assess("create-A").status, "resolved");
  assert.equal(j.unresolved().length, 0);
});

test("SR-F-50: the intent is on disk BEFORE send is called", async () => {
  const path = join(dir(), "req.jsonl"); const j = new RequestJournal(path);
  let onDiskAtSend = null;
  await j.run("c", async (id) => { onDiskAtSend = readFileSync(path, "utf8").includes(id); return {}; });
  assert.equal(onDiskAtSend, true);
});

test("SR-F-51: a call with no persisted ID is reported honestly", () => {
  const j = new RequestJournal(join(dir(), "req.jsonl"));
  assert.equal(j.assess("never-persisted").status, "no_request_id_persisted");
});

function server(handler) { return new Promise((res) => { const s = http.createServer(handler); s.listen(0, "127.0.0.1", () => res({ s, host: `127.0.0.1:${s.address().port}` })); }); }

test("SR-I-10 / ST-01: live PayPal host is refused at construction", () => {
  assert.throws(() => new PayPalReader({ clientId: "a", secret: "b", base: "https://api-m.paypal.com" }), HostRefused);
  assert.throws(() => new PayPalReader({ clientId: "a", secret: "b", base: "https://evil.example.com" }), HostRefused);
  assert.doesNotThrow(() => new PayPalReader({ clientId: "a", secret: "b" }));
  // No option widens the allowlist: passing one is ignored, a live base is still refused.
  assert.throws(() => new PayPalReader({ clientId: "a", secret: "b", base: "https://api-m.paypal.com", allowedHosts: ["api-m.paypal.com"] }), HostRefused);
  assert.throws(() => new PayPalReader({ clientId: "a", secret: "b", base: "http://127.0.0.1:9" }), HostRefused);
});

test("SR-I-10: a redirect to a non-allowlisted host is refused and the other host is never contacted", async () => {
  let evilHits = 0;
  const evil = await server((q, r) => { evilHits++; r.end("{}"); });
  const good = await server((q, r) => {
    if (q.url.startsWith("/v1/oauth2/token")) { r.setHeader("content-type", "application/json"); return r.end(JSON.stringify({ access_token: "t" })); }
    r.writeHead(302, { location: `http://${evil.host}/steal` }); r.end();
  });
  const pp = new TestPayPalReader({ clientId: "a", secret: "b", base: `http://${good.host}`, allowedHosts: [good.host], retries: 1 });
  await assert.rejects(pp.getOrder("X"), RedirectRefused);
  assert.equal(evilHits, 0);
  good.s.close(); evil.s.close();
});

test("PayPalReader: reads a mock order into facts with ALL captures; failed read is explicit unreadable; client has no write methods", async () => {
  const order = { id: "O1", status: "COMPLETED", create_time: "2026-11-01T10:00:00Z", purchase_units: [{ payments: { captures: [{ id: "C1", status: "COMPLETED", amount: { value: "10.00", currency_code: "USD" }, create_time: "2026-11-01T10:05:00Z" }, { id: "C2", status: "COMPLETED", amount: { value: "10.00", currency_code: "USD" } }] } }], payer: { email_address: "a@b.co" } };
  let n = 0;
  const srv = await server((q, r) => {
    r.setHeader("content-type", "application/json");
    if (q.url.startsWith("/v1/oauth2/token")) return r.end(JSON.stringify({ access_token: "t" }));
    n++; if (q.url.includes("BAD")) { r.statusCode = 500; return r.end("{}"); }
    r.statusCode = 200; r.end(JSON.stringify(order));
  });
  const pp = new TestPayPalReader({ clientId: "a", secret: "b", base: `http://${srv.host}`, allowedHosts: [srv.host], retries: 2, retryDelayMs: 1 });
  const f = await pp.getOrder("O1");
  assert.equal(f.captures.length, 2); assert.equal(f.captures[0].createTime, "2026-11-01T10:05:00Z");
  assert.ok(!JSON.stringify(f.redactedRaw).includes("a@b.co"));
  const bad = await pp.getOrder("BAD"); assert.equal(bad.unreadable, true);
  assert.deepEqual(Object.getOwnPropertyNames(PayPalReader.prototype).sort(), ["_hosts", "constructor", "getOrder"]);
  srv.s.close();
});

test("toPayPalFacts keeps every capture", () => {
  const f = toPayPalFacts({ id: "O", status: "COMPLETED", purchase_units: [{ payments: { captures: [{ id: "a" }, { id: "b" }, { id: "c" }] } }] }, "t", "h");
  assert.equal(f.captures.length, 3);
});

test("review: run() never mints a new ID while the same operation is unresolved (restart scenario)", async () => {
  const path = join(dir(), "req.jsonl");
  const sent = [];
  await new RequestJournal(path).run("create-A", async (id) => { sent.push(id); throw new Error("lost"); });
  const restarted = new RequestJournal(path); // simulates an app restart
  await restarted.run("create-A", async (id) => { sent.push(id); return {}; }); // caller forgot retryUnresolved()
  assert.equal(new Set(sent).size, 1);
  assert.equal(restarted.unresolved().length, 0);
});

test("review: audit refuses to append to an already-corrupted or externally-changed log", () => {
  const p = join(dir(), "a.jsonl"); const a = new AuditLog(p); a.append("x", { i: 1 }); a.append("x", { i: 2 });
  const lines = readFileSync(p, "utf8").split("\n").filter(Boolean);
  writeFileSync(p, lines[0].replace('"i":1', '"i":7') + "\n" + lines[1] + "\n");
  const broken = new AuditLog(p);
  assert.throws(() => broken.append("x", {}), /refusing to append/);
  const p2 = join(dir(), "b.jsonl"); const live = new AuditLog(p2); live.append("x", {});
  new AuditLog(p2).append("x", { other: true }); // another writer appended
  assert.throws(() => live.append("x", {}), /changed on disk/);
});

test("review: audit refuses to append when an EARLIER record was edited and the last record is untouched", () => {
  const p = join(dir(), "a.jsonl"); const a = new AuditLog(p);
  for (let i = 1; i <= 3; i++) a.append("x", { i });
  const lines = readFileSync(p, "utf8").split("\n").filter(Boolean);
  writeFileSync(p, [lines[0].replace('"i":1', '"i":42'), lines[1], lines[2]].join("\n") + "\n");
  assert.throws(() => a.append("x", { i: 4 }), /refusing to append/); // same open instance, cached head still matches the last record
  assert.equal(readFileSync(p, "utf8").split("\n").filter(Boolean).length, 3);
});

test("review: two concurrent run() calls with the same label produce ONE request ID and one send", async () => {
  const j = new RequestJournal(join(dir(), "req.jsonl")); const sent = [];
  let release; const gate = new Promise((r) => (release = r));
  const first = j.run("create-A", async (id) => { sent.push(id); await gate; return { ok: 1 }; });
  const second = await j.run("create-A", async (id) => { sent.push(id); return {}; });
  assert.equal(second.rejected, true);
  release(); await first;
  assert.equal(sent.length, 1);
  assert.equal(j.entries().filter((e) => e.kind === "intent").length, 1);
  const other = await j.run("create-B", async (id) => id); // different labels are independent
  assert.ok(other.requestId);
});

test("review: retryUnresolved() does not overlap with an in-flight run() or another retry for the same label", async () => {
  const j = new RequestJournal(join(dir(), "req.jsonl")); const sent = [];
  await j.run("create-A", async () => { throw new Error("lost"); });          // leaves an unresolved intent
  let release; const gate = new Promise((r) => (release = r));
  const retry1 = j.retryUnresolved(async (id) => { sent.push(id); await gate; return {}; });
  const retry2 = await j.retryUnresolved(async (id) => { sent.push(id); return {}; });
  const run = await j.run("create-A", async (id) => { sent.push(id); return {}; });
  assert.equal(retry2[0].rejected, true); assert.equal(run.rejected, true);
  release(); await retry1;
  assert.equal(sent.length, 1);
});

test("review S0-A: long field names are never rewritten; real tokens still are", () => {
  const meta = { meta_data: [{ key: "_wc_order_attribution_session_start_time", value: "2026-11-03 09:07:26" }, { key: "_ppcp_paypal_order_id", value: "2VN877005K8093717" }] };
  const out = redact(meta);
  assert.equal(out.meta_data[0].key, "_wc_order_attribution_session_start_time");
  assert.equal(out.meta_data[1].value, "2VN877005K8093717");
  assert.equal(redactString("_wc_order_attribution_session_start_time"), "_wc_order_attribution_session_start_time");
  for (const tok of ["A21AAKexampleexampleexampleexampleexampleexample1", "cs_0123456789abcdef0123456789abcdef01234567", "ck_" + "a1".repeat(24)]) assert.equal(redactString(tok), "[token]", tok);  // FAKE-TEST-VALUE: deliberately fake, used to prove redaction
  assert.equal(redact({ key: "x", note: "n" }).note, "[redacted]");
});
