// READ-ONLY PayPal client (SR-F-01, SR-I-10..12). It has no capture or create method on purpose:
// money-moving code is gated (BRS 15.1a) until the Threat Model controls are built and tested.
import { sha256 } from "./canonical.js";
import { redact } from "./redact.js";

export const SANDBOX_HOST = "api-m.sandbox.paypal.com";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class RedirectRefused extends Error {}
export class HostRefused extends Error {}

export class PayPalReader {
  /** Sandbox-only by construction. There is no configuration option that widens the allowlist.
   *  Tests that need a local mock server subclass and override _hosts() in test code (test/helpers.js), never in src. */
  constructor({ clientId, secret, base = `https://${SANDBOX_HOST}`, timeoutMs = 20000, retries = 3, retryDelayMs = 500, log = () => {} }) {
    this.#assertAllowed(base);
    Object.assign(this, { clientId, secret, base, timeoutMs, retries, retryDelayMs, log });
    this.token = null;
  }
  _hosts() { return [SANDBOX_HOST]; }
  #assertAllowed(url) {
    const host = new URL(url).host;
    if (!this._hosts().includes(host)) throw new HostRefused(`Refusing non-sandbox host: ${host}`);
  }
  /** fetch that never follows redirects on its own. A redirect is followed only to an allowlisted host. */
  async #fetch(url, init, hops = 0) {
    this.#assertAllowed(url);
    const res = await fetch(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(this.timeoutMs) });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc || hops >= 2) throw new RedirectRefused("redirect without location or too many hops");
      const target = new URL(loc, url).toString();
      try { this.#assertAllowed(target); } catch { throw new RedirectRefused(`redirect to non-allowlisted host refused: ${new URL(target).host}`); }
      if (init?.method && init.method !== "GET") throw new RedirectRefused("redirect on a non-GET request refused");
      return this.#fetch(target, init, hops + 1);
    }
    return res;
  }
  async #auth() {
    const basic = Buffer.from(`${this.clientId}:${this.secret}`).toString("base64");
    const res = await this.#fetch(`${this.base}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.access_token) throw new Error(`auth failed ${res.status}`);
    this.token = json.access_token;
  }
  /** GET only. Every attempt is logged, including network failures. Any 2xx is transport success; the body is validated separately (SR-I-11). */
  async #get(path) {
    let last = { ok: false, status: 0, json: {}, error: "no attempt" };
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      const t0 = Date.now();
      try {
        if (!this.token) await this.#auth();
        const res = await this.#fetch(`${this.base}${path}`, { method: "GET", headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" } });
        const text = await res.text();
        let json; try { json = text ? JSON.parse(text) : {}; } catch { json = null; }
        this.log({ at: new Date().toISOString(), method: "GET", path, attempt, status: res.status, ms: Date.now() - t0 });
        if (res.status === 401) { this.token = null; last = { ok: false, status: 401, json: json ?? {}, rawText: text }; continue; }
        last = { ok: res.ok && json !== null, status: res.status, json: json ?? {}, rawText: text };
        if (last.ok || (res.status >= 400 && res.status < 500)) return last;
      } catch (e) {
        if (e instanceof RedirectRefused || e instanceof HostRefused) { this.log({ at: new Date().toISOString(), method: "GET", path, attempt, status: 0, refused: String(e.message) }); throw e; }
        this.log({ at: new Date().toISOString(), method: "GET", path, attempt, status: 0, error: String(e) });
        last = { ok: false, status: 0, json: {}, error: String(e) };
      }
      if (attempt < this.retries) await sleep(this.retryDelayMs * attempt);
    }
    return last;
  }
  /** Returns PayPalFacts (SRS 4.1) or an explicit unreadable state. Never an empty-but-clean one. */
  async getOrder(paypalOrderId) {
    const retrievedAt = new Date().toISOString();
    const res = await this.#get(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`);
    // Only PayPal's own error body counts as "order does not exist"; a bare 404 from anything in between is not trusted as that.
    if (res.status === 404 && res.json?.name === "RESOURCE_NOT_FOUND") return { unreadable: true, readError: "HTTP 404 RESOURCE_NOT_FOUND", paypalOrderId, retrievedAt };
    if (!res.ok || typeof res.json?.status !== "string") return { unreadable: true, readError: `HTTP ${res.status}${res.error ? " " + res.error : ""}`, paypalOrderId, retrievedAt };
    return toPayPalFacts(res.json, retrievedAt, sha256(res.rawText ?? JSON.stringify(res.json)));
  }
}

export function toPayPalFacts(order, retrievedAt, rawSha256) {
  const captures = [];
  for (const u of order?.purchase_units ?? []) for (const c of u?.payments?.captures ?? []) captures.push({ id: c.id, status: c.status, amount: c.amount?.value ?? null, currency: c.amount?.currency_code ?? null, createTime: c.create_time ?? null });
  // Complete per-unit view (CR-004): keeps each unit's identifiers tied to its own amount, currency and captures.
  const units = (order?.purchase_units ?? []).map((u) => ({ customId: u?.custom_id ?? null, invoiceId: u?.invoice_id ?? null, amount: u?.amount?.value ?? null, currency: u?.amount?.currency_code ?? null, captures: (u?.payments?.captures ?? []).map((c) => ({ id: c.id, status: c.status, amount: c.amount?.value ?? null, currency: c.amount?.currency_code ?? null })) }));
  return { units, paypalOrderId: order.id, customId: order?.purchase_units?.length === 1 ? (order.purchase_units[0]?.custom_id ?? null) : null, purchaseUnitCount: (order?.purchase_units ?? []).length, invoiceId: order?.purchase_units?.length === 1 ? (order.purchase_units[0]?.invoice_id ?? null) : null, unitAmount: order?.purchase_units?.length === 1 ? (order.purchase_units[0]?.amount?.value ?? null) : null, unitCurrency: order?.purchase_units?.length === 1 ? (order.purchase_units[0]?.amount?.currency_code ?? null) : null, orderStatus: order.status, orderCreateTime: order.create_time ?? null, orderUpdateTime: order.update_time ?? null, captures, retrievedAt, rawSha256, redactedRaw: redact(order) };
}
