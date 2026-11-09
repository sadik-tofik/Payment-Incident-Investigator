// READ-ONLY WooCommerce reader (PDR 3.1). GET only, one configured host, no redirects. No write method exists.
// Auth: HTTPS uses HTTP Basic with the REST key; plain http is accepted ONLY for localhost/127.0.0.1 and uses OAuth 1.0a signing
// (as in s0a/capture.mjs; WooCommerce's need for OAuth over http is believed, not verified). Use a READ-ONLY key.
import { createHmac, randomBytes } from "node:crypto";
import { sha256 } from "./canonical.js";
import { localFactsFromWooOrder } from "./identity.js";

const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
const LOCAL_HOSTS = ["localhost", "127.0.0.1"];

export class WooCommerceReader {
  /** pluginName/pluginVersion are operator-declared (PDR DR-7); resolveIdentity rejects versions not in RECORDED_PLUGIN_VERSIONS. */
  constructor({ baseUrl, key, secret, pluginName = "woocommerce-paypal-payments", pluginVersion, timeoutMs = 20000, fetchImpl = fetch }) {
    const u = new URL(baseUrl);
    if (u.protocol !== "https:" && !(u.protocol === "http:" && LOCAL_HOSTS.includes(u.hostname))) throw new Error("WooCommerceReader: https required (http only for localhost)");
    Object.assign(this, { root: u.origin + u.pathname.replace(/\/+$/, ""), origin: u.origin, key, secret, pluginName, pluginVersion, timeoutMs, fetchImpl });
  }
  #url(path) {
    const url = `${this.root}/wp-json/wc/v3${path}`;
    if (url.startsWith("https:")) return { url, headers: { Authorization: "Basic " + Buffer.from(`${this.key}:${this.secret}`).toString("base64") } };
    const p = { oauth_consumer_key: this.key, oauth_nonce: randomBytes(12).toString("hex"), oauth_signature_method: "HMAC-SHA1", oauth_timestamp: String(Math.floor(Date.now() / 1000)) };
    const base = ["GET", enc(url), enc(Object.keys(p).sort().map((k) => `${enc(k)}=${enc(p[k])}`).join("&"))].join("&");
    p.oauth_signature = createHmac("sha1", `${this.secret}&`).update(base).digest("base64");
    return { url: `${url}?${Object.entries(p).map(([k, v]) => `${enc(k)}=${enc(v)}`).join("&")}`, headers: {} };
  }
  /** LocalFacts (allow-listed) or an explicit unreadable state. */
  async getOrderByLocalId(id) {
    const retrievedAt = new Date().toISOString();
    if (!/^\d{1,12}$/.test(String(id))) return { unreadable: true, readError: "invalid_local_order_id", retrievedAt };
    const { url, headers } = this.#url(`/orders/${id}`);
    try {
      const res = await this.fetchImpl(url, { method: "GET", headers, redirect: "manual", signal: AbortSignal.timeout(this.timeoutMs) });
      const text = await res.text();
      if (res.status >= 300 && res.status < 400) return { unreadable: true, readError: `HTTP ${res.status} redirect refused`, retrievedAt };
      let json = null; try { json = JSON.parse(text); } catch { /* handled below */ }
      // ASSUMPTION (not yet seen from a real store): WooCommerce answers a missing order with code woocommerce_rest_shop_order_invalid_id.
      if (res.status === 404 && json?.code === "woocommerce_rest_shop_order_invalid_id") return { unreadable: true, readError: "HTTP 404 ORDER_NOT_FOUND", retrievedAt };
      if (!res.ok || !json || typeof json !== "object" || json.id == null) return { unreadable: true, readError: `HTTP ${res.status}${res.ok ? " unparseable" : ""}`, retrievedAt };
      return localFactsFromWooOrder(json, { pluginName: this.pluginName, pluginVersion: this.pluginVersion, retrievedAt, rawSha256: sha256(text) });
    } catch (e) {
      return { unreadable: true, readError: `network:${String(e?.name ?? "error")}`, retrievedAt };
    }
  }
}
