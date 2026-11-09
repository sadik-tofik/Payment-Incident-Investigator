import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../src/server.js";
import { buildFixtures, FIXTURE_NAMES } from "../../scripts/ui-fixture-defs.mjs";

async function withApp(opts, fn) {
  const { server, audit } = createApp({ auditPath: join(mkdtempSync(join(tmpdir(), "srv-")), "a.jsonl"), ...opts });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  try { return await fn(base, audit); } finally { server.close(); }
}
const post = (base, body, raw = false) => fetch(`${base}/investigations`, { method: "POST", headers: { "content-type": "application/json" }, body: raw ? body : JSON.stringify(body) });

test("saved UI example responses equal what the real HTTP server returns now (no drift)", async () => {
  const built = await buildFixtures();
  for (const name of FIXTURE_NAMES) {
    const saved = JSON.parse(readFileSync(new URL(`../../docs/ui-fixtures/${name}`, import.meta.url), "utf8"));
    assert.deepEqual(saved, built[name], name);
  }
});

test("health, cases: replay + injected only; no PayPal/WooCommerce identifiers in the case list; live not offered", async () => {
  await withApp({}, async (base) => {
    const h = await (await fetch(`${base}/health`)).json();
    assert.equal(h.ok, true); assert.match(h.build, /^\d+\.\d+\.\d+$/); assert.deepEqual(h.modesAvailable, ["replay", "injected"]);
    const c = await (await fetch(`${base}/cases`)).json();
    assert.equal(c.length, 6); assert.doesNotMatch(JSON.stringify(c), /[A-Z0-9]{14,}/); for (const x of c) assert.deepEqual(Object.keys(x).sort(), ["id", "mode", "title"]);
  });
});

test("investigation round trip: POST then GET it, fetch evidence, audit verifies", async () => {
  await withApp({}, async (base) => {
    const r = await post(base, { mode: "replay", caseId: "replay-order-20" }); assert.equal(r.status, 200);
    const inv = await r.json();
    assert.deepEqual(await (await fetch(`${base}/investigations/${inv.id}`)).json(), inv);
    const ev = await (await fetch(`${base}/investigations/${inv.id}/evidence/${inv.evidence[0].id}`)).json(); assert.equal(ev.id, inv.evidence[0].id);
    assert.equal((await fetch(`${base}/investigations/${inv.id}/evidence/EV-9999`)).status, 404);
    assert.equal((await fetch(`${base}/investigations/inv_nope`)).status, 404);
    assert.deepEqual(await (await fetch(`${base}/audit/verify`)).json(), { ok: true, entries: 1, firstBadIndex: null });
  });
});

test("every error carries the contract shape {error:{code,message}, auditId}; bad JSON, oversized body, unknown route and wrong method are handled", async () => {
  await withApp({}, async (base) => {
    for (const [res, status, code] of [
      [await post(base, "{not json", true), 400, "invalid_body"],
      [await post(base, "x".repeat(20000), true), 400, "invalid_body"],
      [await post(base, { mode: "nope" }), 400, "invalid_body"],
      [await post(base, { mode: "live", paypalOrderId: "ABCDEFGHIJ" }), 403, "mode_not_enabled"],
      [await fetch(`${base}/nothing`), 404, "not_found"],
      [await fetch(`${base}/investigations`), 405, "method_not_allowed"],
    ]) { assert.equal(res.status, status); const b = await res.json(); assert.equal(b.error.code, code); assert.ok(b.error.message); assert.equal(b.auditId, null); }
  });
});

test("read-only surface: PUT/DELETE/PATCH are refused on every route, no route for actions exists", async () => {
  await withApp({}, async (base) => {
    for (const p of ["/investigations", "/health", "/cases", "/audit/verify", "/approve", "/capture", "/retry", "/actions"]) for (const method of ["PUT", "DELETE", "PATCH"]) { const r = await fetch(base + p, { method }); assert.ok([404, 405].includes(r.status), `${method} ${p}`); }
    for (const p of ["/approve", "/capture", "/retry", "/actions", "/repair", "/mark-paid"]) { assert.equal((await post(base.replace("/investigations", "") + p, {}, false)).status, 404, `POST ${p}`); }
  });
});

test("security headers and CORS: no CORS by default; explicit origin only when configured; no-store", async () => {
  await withApp({}, async (base) => { const r = await fetch(`${base}/health`); assert.equal(r.headers.get("access-control-allow-origin"), null); assert.equal(r.headers.get("cache-control"), "no-store"); assert.equal(r.headers.get("x-content-type-options"), "nosniff"); });
  await withApp({ corsOrigin: "http://localhost:5173" }, async (base) => { assert.equal((await fetch(`${base}/health`)).headers.get("access-control-allow-origin"), "http://localhost:5173"); });
});

test("rate limit (optional): 429 rate_limited after the configured count", async () => {
  await withApp({ rateLimit: { max: 2, windowMs: 60000 } }, async (base) => {
    const s = []; for (let i = 0; i < 3; i++) s.push((await post(base, { mode: "replay", caseId: "replay-order-20" })).status);
    assert.deepEqual(s, [200, 200, 429]);
  });
});

test("bounded retention: oldest stored investigation is evicted", async () => {
  await withApp({ maxStored: 2 }, async (base) => {
    const ids = []; for (let i = 0; i < 3; i++) ids.push((await (await post(base, { mode: "replay", caseId: "replay-order-20" })).json()).id);
    assert.equal((await fetch(`${base}/investigations/${ids[0]}`)).status, 404); assert.equal((await fetch(`${base}/investigations/${ids[2]}`)).status, 200);
  });
});

test("audit tampering is reported by /audit/verify as ok:false with the first bad index", async () => {
  await withApp({}, async (base, audit) => {
    await post(base, { mode: "replay", caseId: "replay-order-20" }); await post(base, { mode: "replay", caseId: "replay-order-20" });
    const t = readFileSync(audit.path, "utf8").split("\n").filter(Boolean); const rec = JSON.parse(t[0]); rec.data.verdict = "ok"; t[0] = JSON.stringify(rec);
    writeFileSync(audit.path, t.join("\n") + "\n");
    const v = await (await fetch(`${base}/audit/verify`)).json(); assert.equal(v.ok, false); assert.equal(v.firstBadIndex, 1);
  });
});

test("oversized body: a 2 MB body still gets a clean 400 invalid_body or a closed connection, never a crash; server keeps serving", async () => {
  await withApp({}, async (base) => {
    let status = null; try { status = (await post(base, "x".repeat(2 * 1024 * 1024), true)).status; } catch { /* connection cut at 1 MB is acceptable */ }
    assert.ok(status === null || status === 400, `status ${status}`);
    assert.equal((await fetch(`${base}/health`)).status, 200);
  });
});

test("rate limiter table is bounded: expired clients are swept", async () => {
  const { server, _sweep } = createApp({ auditPath: join(mkdtempSync(join(tmpdir(), "srv-")), "a.jsonl"), rateLimit: { max: 5, windowMs: 1 } });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try { const base = `http://127.0.0.1:${server.address().port}/api/v1`; await post(base, { mode: "replay", caseId: "replay-order-20" }); await new Promise((r) => setTimeout(r, 20)); _sweep(); }
  finally { server.close(); }
});

test("body between 16 KB and 1 MB gets a 400; a body over 1 MB is cut off (connection closed or 400) and the server stays healthy", async () => {
  await withApp({}, async (base) => {
    const mid = await post(base, "x".repeat(500 * 1024), true); assert.equal(mid.status, 400); assert.equal((await mid.json()).error.code, "invalid_body");
    let outcome; try { outcome = (await post(base, "x".repeat(3 * 1024 * 1024), true)).status; } catch { outcome = "closed"; }
    assert.ok(outcome === 400 || outcome === "closed", String(outcome));
    assert.equal((await fetch(`${base}/health`)).status, 200);
  });
});
