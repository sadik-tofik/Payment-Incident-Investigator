// Smoke test of the capture script against LOCAL MOCKS. Proves the script's mechanics only; says nothing about real WooCommerce.
import { test } from "node:test"; import assert from "node:assert/strict";
import http from "node:http"; import { execFileSync, execFile } from "node:child_process"; import { promisify } from "node:util"; const execFileP = promisify(execFile);
import { fileURLToPath } from "node:url"; import { mkdtempSync, readFileSync, readdirSync } from "node:fs"; import { tmpdir } from "node:os"; import { join } from "node:path";
import { createHmac } from "node:crypto";
const enc = (x) => encodeURIComponent(x).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
// Independent re-implementation of the OAuth 1.0a check (still our reading of the spec, NOT WooCommerce itself).
function verifyOauth(q, secret) {
  const u = new URL(q.url, "http://127.0.0.1"); const p = Object.fromEntries(u.searchParams); const sig = p.oauth_signature; delete p.oauth_signature;
  const baseUrl = `http://${q.headers.host}${u.pathname}`;
  const base = ["GET", enc(baseUrl), enc(Object.keys(p).sort().map((k) => `${enc(k)}=${enc(p[k])}`).join("&"))].join("&");
  return sig === createHmac("sha1", secret + "&").update(base).digest("base64") && p.oauth_signature_method === "HMAC-SHA1";
}
const listen = (h) => new Promise((r) => { const s = http.createServer(h); s.listen(0, "127.0.0.1", () => r({ s, port: s.address().port })); });
test("capture.mjs finds ids, scrubs buyer data, keeps secrets out of every file", async () => {
  const pp = await listen((q, r) => { r.setHeader("content-type", "application/json"); if (q.url.includes("oauth2")) return r.end('{"access_token":"TOKEN-SECRET-123"}'); r.end(JSON.stringify({ id: "PPORDER1", status: "COMPLETED", create_time: "2026-11-03T08:00:00Z", payer: { email_address: "buyer@example.com" }, purchase_units: [{ payments: { captures: [{ id: "CAP9", status: "COMPLETED", amount: { value: "10.00", currency_code: "USD" }, create_time: "2026-11-03T08:05:00Z" }] } }] })); });
  const seen = [];
  const wc = await listen((q, r) => { r.setHeader("content-type", "application/json"); seen.push(q.url); if (!q.url.startsWith("/wordpress/wp-json/wc/v3/")) { r.statusCode = 404; return r.end("{}"); } if (!verifyOauth(q, "cs_SECRETVAL")) { r.statusCode = 401; return r.end("{}"); }
    if (q.url.includes("/notes")) return r.end(JSON.stringify([{ date_created_gmt: "2026-11-03T08:05:01", customer_note: false, note: "PayPal capture CAP9 completed for jane@example.com" }]));
    if (q.url.includes("payment_gateways")) return r.end(JSON.stringify([{ id: "ppcp-gateway", title: "PayPal", enabled: true }]));
    r.end(JSON.stringify({ id: 77, status: "processing", total: "10.00", currency: "USD", payment_method: "ppcp-gateway", transaction_id: "CAP9", date_paid_gmt: "2026-11-03T08:05:02", billing: { email: "buyer@example.com", first_name: "Jane" }, meta_data: [{ key: "_ppcp_paypal_order_id", value: "PPORDER1" }, { key: "_wc_order_attribution_session_start_time", value: "2026-11-03 09:07:26" }] })); });
  const out = mkdtempSync(join(tmpdir(), "s0a-"));
  const env = { ...process.env, WC_BASE_URL: `http://127.0.0.1:${wc.port}/wordpress/`, WC_KEY: "ck_SECRETKEY", WC_SECRET: "cs_SECRETVAL", PAYPAL_CLIENT_ID: "CID-SECRET", PAYPAL_SECRET: "PPSECRET-XYZ", S0A_PAYPAL_BASE: `http://127.0.0.1:${pp.port}` };
  const { stdout } = await execFileP("node", [fileURLToPath(new URL("./capture.mjs", import.meta.url)), "--wc-order", "77", "--paypal-order", "PPORDER1", "--out", out], { env });
  const s = JSON.parse(readFileSync(join(out, "shareable", "summary.json"), "utf8"));
  assert.equal(s.answers["Q1 PayPal order id readable via REST"], true); assert.equal(s.answers["Q2 capture id readable via REST"], true);
  assert.deepEqual(s.paypalOrderIdFoundAt, ["$.order.meta_data[0].value"]);
  const all = [stdout, ...["shareable"].flatMap((d) => readdirSync(join(out, d)).map((f) => readFileSync(join(out, d, f), "utf8")))].join("\n");
  for (const leak of ["SECRET", "TOKEN-SECRET", "buyer@example.com", "jane@example.com", "Jane"]) assert.ok(!all.includes(leak), "leaked: " + leak);
  assert.match(readFileSync(join(out, "SHA256SUMS"), "utf8"), /raw\/wcOrder\.http200\.json/);
  assert.ok(seen.length >= 3 && seen.every((u) => u.startsWith("/wordpress/wp-json/wc/v3/")), "subdirectory preserved: " + seen.join(","));
  assert.ok(readFileSync(join(out, "shareable", "wcOrder.json"), "utf8").includes("_wc_order_attribution_session_start_time"), "long field name must survive scrubbing");
  assert.ok(!all.includes("oauth_signature"), "signed URLs must not be saved");
  pp.s.close(); wc.s.close();
});
test("capture.mjs refuses a live PayPal base and non-local plain-http WooCommerce", () => {
  const base = { ...process.env, WC_KEY: "k", WC_SECRET: "s", PAYPAL_CLIENT_ID: "c", PAYPAL_SECRET: "p" };
  const run = (env) => { try { execFileSync("node", [fileURLToPath(new URL("./capture.mjs", import.meta.url)), "--wc-order", "1", "--paypal-order", "X", "--out", mkdtempSync(join(tmpdir(), "s0a-"))], { env, stdio: "pipe" }); return 0; } catch (e) { return e.status; } };
  assert.equal(run({ ...base, WC_BASE_URL: "http://localhost:1", S0A_PAYPAL_BASE: "https://api-m.paypal.com" }), 2);
  assert.equal(run({ ...base, WC_BASE_URL: "http://shop.example.com" }), 2);
});
