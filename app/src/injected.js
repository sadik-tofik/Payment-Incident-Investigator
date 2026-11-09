// Injected cases: synthetic orders built through the REAL mappers, then labelled injected. NOT real merchant incidents (SR-F-05, SR-F-60).
import { toPayPalFacts } from "./paypalClient.js";
import { localFactsFromWooOrder } from "./identity.js";
import { REPLAY_PLUGIN } from "./replay.js";

const T = "2026-11-01T11:00:00Z";
const cap = (id) => ({ id, status: "COMPLETED", amount: { value: "10.00", currency_code: "USD" }, create_time: "2026-11-01T10:05:00Z" });
const ppOrder = (id, n, caps) => ({ id, status: "COMPLETED", create_time: "2026-11-01T10:00:00Z", purchase_units: [{ custom_id: String(n), invoice_id: `inj-${n}`, amount: { value: "10.00", currency_code: "USD" }, payments: { captures: caps } }] });
const wcOrder = (id, n, o) => ({ id: n, status: "pending", total: "10.00", currency: "USD", meta_data: [{ key: "_ppcp_paypal_order_id", value: id }], ...o });

const DEFS = [
  { id: "injected-captured-local-unpaid", title: "Injected: PayPal captured, store still pending", pp: "INJECTED0001", n: 501, caps: [cap("CAPINJ1")], wc: {} },
  { id: "injected-amount-mismatch", title: "Injected: capture amount differs from store total", pp: "INJECTED0002", n: 502, caps: [cap("CAPINJ2")], wc: { total: "12.00" } },
  { id: "injected-multiple-captures", title: "Injected: two captures on one order", pp: "INJECTED0003", n: 503, caps: [cap("CAPINJ3A"), cap("CAPINJ3B")], wc: { status: "processing" } },
];

export function loadInjected() {
  const pp = new Map(), wc = new Map(), byId = new Map();
  for (const d of DEFS) {
    pp.set(d.pp, { ...toPayPalFacts(ppOrder(d.pp, d.n, d.caps), T, "injected"), injected: true });
    wc.set(String(d.n), { ...localFactsFromWooOrder(wcOrder(d.pp, d.n, d.wc), { pluginName: REPLAY_PLUGIN.name, pluginVersion: REPLAY_PLUGIN.version, retrievedAt: T, rawSha256: "injected" }), injected: true });
    byId.set(d.id, { mode: "injected", paypalOrderId: d.pp });
  }
  return {
    publicCases: () => DEFS.map(({ id, title }) => ({ id, title, mode: "injected" })),
    caseToInput: (id) => byId.get(id) ?? null,
    paypal: { async getOrder(id) { return pp.get(id) ?? { unreadable: true, readError: "HTTP 404 RESOURCE_NOT_FOUND", paypalOrderId: id, retrievedAt: T }; } },
    store: { async getOrderByLocalId(id) { return wc.get(String(id)) ?? { unreadable: true, readError: "HTTP 404 ORDER_NOT_FOUND", retrievedAt: T }; } },
  };
}
