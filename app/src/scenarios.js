// ReferenceStore + labelled scenarios. Every item is INJECTED (SR-F-05, SR-F-60): it is never presented as a real merchant incident.
import { normalizeLocalStatus } from "./normalize.js";

const T0 = "2026-11-01T10:00:00Z";
const mkPaypal = (o = {}) => ({ paypalOrderId: "PP-REF-1", orderStatus: "COMPLETED", captures: [{ id: "CAP-1", status: "COMPLETED", amount: "10.00", currency: "USD", createTime: "2026-11-01T10:05:00Z" }], retrievedAt: "2026-11-01T11:00:00Z", rawSha256: "ref", injected: true, ...o });
const mkLocal = (raw, o = {}) => ({ localOrderId: "WC-REF-1", rawStatus: raw, normalizedStatus: normalizeLocalStatus(raw), total: "10.00", currency: "USD", dateCreated: T0, paypalOrderIdRef: "PP-REF-1", retrievedAt: "2026-11-01T11:00:01Z", rawSha256: "ref", injected: true, ...o });

/** Labelled evaluation set (BO-2a). `expect` is the human-written label, not produced by the engine. */
const ONE_TO_ONE = { localCount: 1, paypalCount: 1 };
export const LABELLED = [
  { name: "ok", paypal: mkPaypal(), local: mkLocal("processing"), expect: "ok" },
  { name: "not approved", paypal: mkPaypal({ orderStatus: "CREATED", captures: [] }), local: mkLocal("pending"), expect: "not_approved" },
  { name: "P0-A approved not captured", paypal: mkPaypal({ orderStatus: "APPROVED", captures: [] }), local: mkLocal("pending"), expect: "approved_not_captured", p0: true },
  { name: "P0-A local cancelled", paypal: mkPaypal({ orderStatus: "APPROVED", captures: [] }), local: mkLocal("cancelled"), expect: "approved_not_captured_locally_cancelled", p0: true },
  { name: "P0-B captured local pending", paypal: mkPaypal(), local: mkLocal("pending"), expect: "captured_local_unpaid", p0: true },
  { name: "P0-B captured local on-hold", paypal: mkPaypal(), local: mkLocal("on-hold"), expect: "captured_local_unpaid", p0: true },
  { name: "P0-B captured local failed", paypal: mkPaypal(), local: mkLocal("failed"), expect: "captured_local_unpaid", p0: true },
  { name: "captured local cancelled", paypal: mkPaypal(), local: mkLocal("cancelled"), expect: "captured_local_cancelled" },
  { name: "capture pending", paypal: mkPaypal({ captures: [{ id: "CAP-1", status: "PENDING", amount: "10.00", currency: "USD" }] }), local: mkLocal("pending"), expect: "capture_pending" },
  { name: "capture declined", paypal: mkPaypal({ orderStatus: "APPROVED", captures: [{ id: "CAP-1", status: "DECLINED", amount: "10.00", currency: "USD" }] }), local: mkLocal("pending"), expect: "capture_declined" },
  { name: "multiple captures", paypal: mkPaypal({ captures: [{ id: "CAP-1", status: "COMPLETED", amount: "10.00", currency: "USD" }, { id: "CAP-2", status: "COMPLETED", amount: "10.00", currency: "USD" }] }), local: mkLocal("processing"), expect: "multiple_captures" },
  { name: "amount mismatch", paypal: mkPaypal(), local: mkLocal("processing", { total: "12.00" }), expect: "amount_mismatch" },
  { name: "currency mismatch", paypal: mkPaypal(), local: mkLocal("processing", { currency: "EUR" }), expect: "amount_mismatch" },
  { name: "paypal unreadable", paypal: { unreadable: true, readError: "HTTP 500", injected: true }, local: mkLocal("processing"), expect: "unknown" },
  { name: "store unreadable", paypal: mkPaypal(), local: { unreadable: true, readError: "HTTP 500", injected: true }, expect: "unknown" },
  { name: "unrecognised local status", paypal: mkPaypal(), local: mkLocal("refunded"), expect: "unknown" },
  { name: "ambiguous match", paypal: mkPaypal(), local: mkLocal("processing"), match: { localCount: 2, paypalCount: 1 }, expect: "unknown" },
  { name: "missing match evidence", paypal: mkPaypal(), local: mkLocal("processing"), match: null, expect: "unknown" },
  { name: "unparseable amount", paypal: mkPaypal({ captures: [{ id: "CAP-1", status: "COMPLETED", amount: "ten", currency: "USD" }] }), local: mkLocal("processing"), expect: "unknown" },
];

for (const c of LABELLED) if (!("match" in c)) c.match = ONE_TO_ONE;

export class ReferenceStore {
  constructor(orders = []) { this.orders = new Map(orders.map((o) => [o.localOrderId, o])); }
  async getOrderByLocalId(id) { const o = this.orders.get(id); if (!o) return { unreadable: true, readError: "not_found", injected: true }; return o; }
  async findOrdersByPayPalOrderId(ppId) { return [...this.orders.values()].filter((o) => o.paypalOrderIdRef === ppId); }
  // No updateOrderStatus: Tier 2 is gated (SRS 8, S0-D).
}
export { mkPaypal, mkLocal, ONE_TO_ONE };
