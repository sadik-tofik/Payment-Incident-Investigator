// Deterministic incident engine core. No AI, no network, no side effects.
// The AI layer later explains these verdicts; it never decides whether money moves.

export const INCIDENTS = {
  OK: "ok",
  NOT_APPROVED: "not_approved",
  APPROVED_NOT_CAPTURED: "approved_not_captured",
  APPROVED_NOT_CAPTURED_LOCALLY_CANCELLED: "approved_not_captured_locally_cancelled",
  CAPTURED_LOCAL_UNPAID: "captured_local_unpaid",
  CAPTURED_LOCAL_CANCELLED: "captured_local_cancelled",
  CAPTURE_PENDING: "capture_pending",
  CAPTURE_DECLINED: "capture_declined",
  UNKNOWN: "unknown",
};

const LOCAL_PAID = new Set(["processing", "completed"]);
const LOCAL_UNPAID = new Set(["pending", "on-hold", "failed"]);

/**
 * @param {{status?:string, captureStatus?:string|null}} paypal  authoritative PayPal state
 * @param {{status:string}} local                                  merchant (e.g. WooCommerce) order status
 * @returns {{incident:string, safeActions:string[], forbiddenActions:string[], reason:string}}
 */
export function classify(paypal, local) {
  const p = paypal?.status;
  const c = paypal?.captureStatus ?? null;
  const l = local?.status;

  const v = (incident, reason, safeActions = [], forbiddenActions = []) => ({ incident, reason, safeActions, forbiddenActions });

  if (!p || !l) return v(INCIDENTS.UNKNOWN, "Missing PayPal or local state; establish both before acting.", ["escalate"], ["capture", "refund"]);

  if (p === "COMPLETED") {
    if (c === "COMPLETED") {
      if (LOCAL_PAID.has(l)) return v(INCIDENTS.OK, "Captured at PayPal and paid locally.");
      if (LOCAL_UNPAID.has(l)) return v(INCIDENTS.CAPTURED_LOCAL_UNPAID, "Money was captured but the local order is not marked paid.", ["mark_local_paid"], ["capture"]);
      if (l === "cancelled") return v(INCIDENTS.CAPTURED_LOCAL_CANCELLED, "Money was captured but the local order was cancelled; customer is charged for nothing.", ["restore_local_order_or_refund_after_review"], ["capture"]);
    }
    if (c === "PENDING") return v(INCIDENTS.CAPTURE_PENDING, "Capture exists but is pending; do not treat as paid or failed yet.", ["wait_and_recheck"], ["capture", "refund"]);
    if (c === "DECLINED" || c === "FAILED") return v(INCIDENTS.CAPTURE_DECLINED, "Capture did not succeed.", ["notify_customer"], ["mark_local_paid"]);
  }

  if (p === "APPROVED") {
    if (l === "cancelled") {
      return v(
        INCIDENTS.APPROVED_NOT_CAPTURED_LOCALLY_CANCELLED,
        "Buyer approved but nothing was captured, and the merchant already cancelled the order. Capturing could charge a buyer for an order the merchant treats as cancelled.",
        ["ask_human_to_review", "contact_customer"],
        ["auto_capture"],
      );
    }
    return v(INCIDENTS.APPROVED_NOT_CAPTURED, "Buyer approved but no capture happened.", ["ask_human_to_approve_capture"], ["auto_capture"]);
  }

  if (p === "CREATED" || p === "PAYER_ACTION_REQUIRED") {
    return v(INCIDENTS.NOT_APPROVED, "Buyer has not approved; no incident.", [], ["capture"]);
  }

  return v(INCIDENTS.UNKNOWN, `Unhandled PayPal status ${p}.`, ["escalate"], ["capture", "refund"]);
}

/** Detect several local orders pointing at the same PayPal order. */
export function findDuplicateLocalOrders(localOrders) {
  const by = new Map();
  for (const o of localOrders) {
    if (!o.paypalOrderId) continue;
    by.set(o.paypalOrderId, [...(by.get(o.paypalOrderId) ?? []), o.id]);
  }
  return [...by.entries()].filter(([, ids]) => ids.length > 1).map(([paypalOrderId, localIds]) => ({ paypalOrderId, localIds }));
}

/** Summarise an authoritative PayPal order object into the shape classify() expects. */
export function paypalState(order) {
  const cap = order?.purchase_units?.[0]?.payments?.captures?.[0];
  return { status: order?.status, captureStatus: cap?.status ?? null };
}
