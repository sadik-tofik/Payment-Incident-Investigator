#!/usr/bin/env node
// S0-A capture. READ-ONLY. Fetches one WooCommerce order (+ notes, + gateways) and the matching PayPal sandbox order,
// stores RAW files locally, writes a scrubbed shareable copy, and reports WHERE the PayPal IDs appear in the WooCommerce data.
// Requests: ONE POST to the PayPal sandbox OAuth token endpoint (to obtain an access token). Everything else is GET. It never creates, captures, refunds or modifies anything.
// It sends nothing anywhere except to YOUR WooCommerce URL and the PayPal sandbox. Secrets come from env vars and are never printed or saved.
//
// Usage:
//   export WC_BASE_URL=http://localhost:8080   WC_KEY=ck_...  WC_SECRET=cs_...     (read-only REST key)
//   export PAYPAL_CLIENT_ID=...  PAYPAL_SECRET=...                                   (SANDBOX app)
//   node capture.mjs --wc-order 123 --paypal-order 5LV75741Y0902515G [--out ./out]
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { join } from "node:path";
import { redactString } from "../app/src/redact.js";

const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : undefined; };
const wcOrder = arg("--wc-order"), ppOrder = arg("--paypal-order"), out = arg("--out") ?? "./out";
const { WC_BASE_URL, WC_KEY, WC_SECRET, PAYPAL_CLIENT_ID, PAYPAL_SECRET } = process.env;
const PAYPAL_BASE = process.env.S0A_PAYPAL_BASE ?? "https://api-m.sandbox.paypal.com"; // override exists only for the smoke test
if (!wcOrder || !ppOrder || !WC_BASE_URL || !WC_KEY || !WC_SECRET || !PAYPAL_CLIENT_ID || !PAYPAL_SECRET) { console.error("Missing arguments or env vars. See the header of this file."); process.exit(2); }

// Safety: PayPal host must be the sandbox (or a loopback mock for the smoke test). WooCommerce over plain http only on localhost.
const ppHost = new URL(PAYPAL_BASE).host;
if (ppHost !== "api-m.sandbox.paypal.com" && !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(ppHost)) { console.error("Refusing non-sandbox PayPal host: " + ppHost); process.exit(2); }
const wc = new URL(WC_BASE_URL);
if (wc.protocol === "http:" && !/^(localhost|127\.0\.0\.1)$/.test(wc.hostname)) { console.error("Refusing plain http to a non-local WooCommerce host."); process.exit(2); }

const raw = join(out, "raw"), share = join(out, "shareable");
mkdirSync(raw, { recursive: true }); mkdirSync(share, { recursive: true });
const sha = (s) => createHash("sha256").update(s).digest("hex");
const sums = [];
const save = (dir, name, text) => { writeFileSync(join(dir, name), text); sums.push(`${sha(text)}  ${dir.split("/").pop()}/${name}`); };

async function get(url, headers) {
  const t0 = Date.now();
  const res = await fetch(url, { headers, redirect: "manual", signal: AbortSignal.timeout(30000) });
  const text = await res.text();
  return { status: res.status, text, ms: Date.now() - t0, retrievedAt: new Date().toISOString() };
}
// Keep any subdirectory in WC_BASE_URL (for example http://localhost:8080/wordpress).
const wcRoot = wc.origin + wc.pathname.replace(/\/+$/, "");
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
// HTTPS: HTTP Basic with the consumer key and secret. Plain HTTP (local dev): WooCommerce is believed to require OAuth 1.0a
// signing for REST keys (unverified; if you get HTTP 401 please say so, that is a finding). READ-ONLY key either way.
function wcGet(path) {
  const url = `${wcRoot}/wp-json/wc/v3${path}`;
  if (wc.protocol === "https:") return get(url, { Authorization: "Basic " + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString("base64") });
  const params = { oauth_consumer_key: WC_KEY, oauth_nonce: randomBytes(12).toString("hex"), oauth_signature_method: "HMAC-SHA1", oauth_timestamp: String(Math.floor(Date.now() / 1000)) };
  const base = ["GET", enc(url), enc(Object.keys(params).sort().map((k) => `${enc(k)}=${enc(params[k])}`).join("&"))].join("&");
  params.oauth_signature = createHmac("sha1", `${WC_SECRET}&`).update(base).digest("base64");
  return get(`${url}?${Object.entries(params).map(([k, v]) => `${enc(k)}=${enc(v)}`).join("&")}`, {});
}

// PayPal token + order (token is never saved or printed)
const tokRes = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, { method: "POST", redirect: "manual", headers: { Authorization: "Basic " + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
const tok = (await tokRes.json().catch(() => ({}))).access_token;
if (!tok) { console.error("PayPal auth failed (HTTP " + tokRes.status + "). Check sandbox credentials."); process.exit(1); }

const results = {
  wcOrder: await wcGet(`/orders/${encodeURIComponent(wcOrder)}`),
  wcNotes: await wcGet(`/orders/${encodeURIComponent(wcOrder)}/notes`),
  wcGateways: await wcGet(`/payment_gateways`),
  ppOrder: await get(`${PAYPAL_BASE}/v2/checkout/orders/${encodeURIComponent(ppOrder)}`, { Authorization: `Bearer ${tok}` }),
};
const parsed = {};
for (const [k, r] of Object.entries(results)) {
  save(raw, `${k}.http${r.status}.json`, r.text);               // RAW: keep local, do not share
  try { parsed[k] = JSON.parse(r.text); } catch { parsed[k] = null; }
}

// Scrubbed copy: drops buyer blocks, scrubs emails/phones/tokens inside strings. Order notes are KEPT (they may hold plugin IDs).
const DROP = new Set(["billing", "shipping", "payer", "email_address", "customer_ip_address", "customer_user_agent", "customer_note"]);
const scrub = (v) => v == null ? v : typeof v === "string" ? redactString(v) : Array.isArray(v) ? v.map(scrub) : typeof v === "object" ? Object.fromEntries(Object.entries(v).filter(([k]) => !DROP.has(k)).map(([k, x]) => [k, k === "key" && typeof x === "string" ? x : scrub(x)])) : v;
for (const [k, p] of Object.entries(parsed)) save(share, `${k}.json`, JSON.stringify(scrub(p), null, 2));

// Where do the PayPal ids appear in the WooCommerce data? (the S0-A question)
const ppJson = parsed.ppOrder ?? {};
const captureIds = (ppJson.purchase_units ?? []).flatMap((u) => (u.payments?.captures ?? []).map((c) => c.id));
const where = (needle, obj, path = "$", acc = []) => {
  if (typeof obj === "string") { if (obj.includes(needle)) acc.push(path); }
  else if (Array.isArray(obj)) obj.forEach((x, i) => where(needle, x, `${path}[${i}]`, acc));
  else if (obj && typeof obj === "object") for (const [k, x] of Object.entries(obj)) where(needle, x, `${path}.${k}`, acc);
  return acc;
};
const wo = parsed.wcOrder ?? {}, notes = Array.isArray(parsed.wcNotes) ? parsed.wcNotes : [];
const summary = {
  capturedAt: new Date().toISOString(),
  httpStatus: Object.fromEntries(Object.entries(results).map(([k, r]) => [k, r.status])),
  paypal: { id: ppJson.id, status: ppJson.status, create_time: ppJson.create_time, update_time: ppJson.update_time, captureIds, captures: (ppJson.purchase_units ?? []).flatMap((u) => (u.payments?.captures ?? []).map((c) => ({ id: c.id, status: c.status, amount: c.amount, create_time: c.create_time }))) },
  woo: { id: wo.id, status: wo.status, currency: wo.currency, total: wo.total, date_created_gmt: wo.date_created_gmt, date_modified_gmt: wo.date_modified_gmt, date_paid_gmt: wo.date_paid_gmt, payment_method: wo.payment_method, payment_method_title: wo.payment_method_title, transaction_id: wo.transaction_id, meta_data_keys: (wo.meta_data ?? []).map((m) => m.key) },
  notes: notes.map((n) => ({ date_created_gmt: n.date_created_gmt, customer_note: n.customer_note, note: redactString(String(n.note ?? "")).slice(0, 300) })),
  gateways: Array.isArray(parsed.wcGateways) ? parsed.wcGateways.map((g) => ({ id: g.id, title: g.title, enabled: g.enabled })) : null,
  paypalOrderIdFoundAt: [...where(ppJson.id ?? "§", wo, "$.order"), ...where(ppJson.id ?? "§", notes, "$.notes")],
  captureIdsFoundAt: Object.fromEntries(captureIds.map((c) => [c, [...where(c, wo, "$.order"), ...where(c, notes, "$.notes")]])),
  answers: {
    "Q1 PayPal order id readable via REST": null, "Q2 capture id readable via REST": null, "Q3 which status means paid": wo.status ?? null,
    "Q4 does date_paid exist": wo.date_paid_gmt ?? null, "Q5 are there timestamped notes": notes.length,
  },
};
summary.answers["Q1 PayPal order id readable via REST"] = summary.paypalOrderIdFoundAt.length > 0;
summary.answers["Q2 capture id readable via REST"] = captureIds.length > 0 && captureIds.every((c) => summary.captureIdsFoundAt[c].length > 0);
save(share, "summary.json", JSON.stringify(summary, null, 2));
writeFileSync(join(out, "SHA256SUMS"), sums.join("\n") + "\n");
console.log(JSON.stringify({ httpStatus: summary.httpStatus, answers: summary.answers, paypalOrderIdFoundAt: summary.paypalOrderIdFoundAt, captureIdsFoundAt: summary.captureIdsFoundAt, meta_data_keys: summary.woo.meta_data_keys }, null, 2));
console.log(`\nSend me: ${join(out, "shareable")}/ (all files). Do NOT send ${raw}/ unless you have checked it contains no real personal data.`);
