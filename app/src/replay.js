// Replay: serves recorded REAL sandbox responses through the real mapping code (toPayPalFacts, localFactsFromWooOrder). No network.
import { readFileSync } from "node:fs";
import { sha256 } from "./canonical.js";
import { toPayPalFacts } from "./paypalClient.js";
import { localFactsFromWooOrder } from "./identity.js";

const DIR = new URL("../data/replay/", import.meta.url);
export const REPLAY_PLUGIN = { name: "woocommerce-paypal-payments", version: "4.2.0", source: "operator_declared" };

export function loadReplay(dir = DIR) {
  const m = JSON.parse(readFileSync(new URL("cases.json", dir), "utf8"));
  const read = (f) => { const t = readFileSync(new URL(f, dir), "utf8"); return { json: JSON.parse(t), sha: sha256(t) }; };
  const pp = new Map(), wc = new Map(), cases = [], byId = new Map();
  for (const c of m.cases) {
    const p = read(c.paypalFile), w = read(c.wooFile);
    const paypal = toPayPalFacts(p.json, c.retrievedAt, p.sha);
    const local = localFactsFromWooOrder(w.json, { pluginName: REPLAY_PLUGIN.name, pluginVersion: REPLAY_PLUGIN.version, retrievedAt: c.retrievedAt, rawSha256: w.sha });
    pp.set(paypal.paypalOrderId, paypal); wc.set(local.localOrderId, local);
    cases.push({ id: c.id, title: c.title, mode: "replay", paypalOrderId: paypal.paypalOrderId, invoicePrefix: c.invoicePrefix });
    byId.set(c.id, { mode: "replay", paypalOrderId: paypal.paypalOrderId, invoicePrefix: c.invoicePrefix });
  }
  return { cases, caseToInput: (id) => byId.get(id) ?? null, publicCases: () => cases.map(({ id, title, mode }) => ({ id, title, mode })), paypal: { async getOrder(id) { return pp.get(id) ?? { unreadable: true, readError: "HTTP 404 RESOURCE_NOT_FOUND", paypalOrderId: id, retrievedAt: new Date().toISOString() }; } }, store: { async getOrderByLocalId(id) { return wc.get(String(id)) ?? { unreadable: true, readError: "HTTP 404 ORDER_NOT_FOUND", retrievedAt: new Date().toISOString() }; } } };
}
