import { canonical, sha256 } from "./canonical.js";
/** SRS 6.3: only fields that can change whether an action is allowed. Excludes retrievedAt, raw bytes, request IDs. */
export function decisionState(paypal, local, verdict, match = null) {
  return {
    paypalOrderId: paypal?.paypalOrderId ?? null,
    orderStatus: paypal?.orderStatus ?? null,
    captures: (paypal?.captures ?? []).map((c) => ({ id: c.id, status: c.status, amount: c.amount, currency: c.currency })),
    localOrderId: local?.localOrderId ?? null,
    normalizedStatus: local?.normalizedStatus ?? null,
    total: local?.total ?? null,
    localCurrency: local?.currency ?? null,
    paypalOrderIdRef: local?.paypalOrderIdRef ?? null,
    // CR-004 (proposed): every fact the identity check and the decision rules consume.
    paypalCustomId: paypal?.customId ?? null,
    paypalInvoiceId: paypal?.invoiceId ?? null,
    paypalUnits: paypal?.units ?? null,
    paypalOrderIdRefCount: local?.paypalOrderIdRefCount ?? null,
    paypalPurchaseUnitCount: paypal?.purchaseUnitCount ?? null,
    paypalUnitAmount: paypal?.unitAmount ?? null,
    paypalUnitCurrency: paypal?.unitCurrency ?? null,
    pluginName: local?.pluginName ?? null,
    pluginVersion: local?.pluginVersion ?? null,
    identity: match?.identity ?? null,
    identityReason: match?.reason ?? null,
    verdict,
  };
}
export const stateFingerprint = (paypal, local, verdict, match = null) => sha256(canonical(decisionState(paypal, local, verdict, match)));
