// Minimal PayPal REST client (sandbox only). No dependencies.
import { randomUUID } from "node:crypto";

const SANDBOX = "https://api-m.sandbox.paypal.com";

export class PayPal {
  constructor({ clientId, secret, base = SANDBOX, log = () => {} }) {
    if (!base.includes("sandbox") && !base.startsWith("http://127.0.0.1")) {
      throw new Error("Refusing to run against a non-sandbox host: " + base);
    }
    this.clientId = clientId;
    this.secret = secret;
    this.base = base;
    this.log = log;
    this.token = null;
  }

  async auth() {
    const basic = Buffer.from(`${this.clientId}:${this.secret}`).toString("base64");
    const res = await fetch(`${this.base}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`auth failed ${res.status}: ${JSON.stringify(json)}`);
    this.token = json.access_token;
  }

  // Every call records request id, status and PayPal debug id so incidents can be reconstructed.
  async call(method, path, { body, requestId } = {}) {
    if (!this.token) await this.auth();
    const headers = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    };
    if (requestId) headers["PayPal-Request-Id"] = requestId;
    const started = Date.now();
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
    const entry = {
      at: new Date().toISOString(),
      method, path, requestId: requestId ?? null,
      status: res.status,
      debugId: res.headers.get("paypal-debug-id"),
      ms: Date.now() - started,
    };
    this.log(entry);
    return { ok: res.ok, status: res.status, json, entry };
  }

  newRequestId() { return randomUUID(); }

  createOrder({ amount = "10.00", currency = "USD", referenceId, requestId }) {
    return this.call("POST", "/v2/checkout/orders", {
      requestId,
      body: {
        intent: "CAPTURE",
        purchase_units: [{ reference_id: referenceId, custom_id: referenceId, amount: { currency_code: currency, value: amount } }],
        payment_source: {
          paypal: {
            experience_context: {
              return_url: "https://example.com/return",
              cancel_url: "https://example.com/cancel",
              user_action: "PAY_NOW",
            },
          },
        },
      },
    });
  }

  getOrder(id) { return this.call("GET", `/v2/checkout/orders/${id}`); }
  captureOrder(id, requestId) { return this.call("POST", `/v2/checkout/orders/${id}/capture`, { body: {}, requestId }); }
}

export function approvalLink(order) {
  const links = order?.links ?? [];
  return (links.find((l) => l.rel === "payer-action") ?? links.find((l) => l.rel === "approve"))?.href ?? null;
}

export function captureOf(order) {
  return order?.purchase_units?.[0]?.payments?.captures?.[0] ?? null;
}
