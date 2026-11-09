// CR-001 items 1, 2, 3, 5. Adapter-side mapping from a WooCommerce REST order to LocalFacts, and the two-way identity check.
// Evidence basis: S0-A and S0-B runs against WooCommerce 11.2.1 + WooCommerce PayPal Payments 4.2.0 (two completed orders). Nothing else is known.
import { normalizeLocalStatus, toMinor } from "./normalize.js";

export const PAYPAL_ORDER_ID_META_KEY = "_ppcp_paypal_order_id";   // plugin-internal key; version-specific
export const RECORDED_PLUGIN_VERSIONS = Object.freeze({ "woocommerce-paypal-payments": ["4.2.0"] });

/** WooCommerce REST order JSON -> LocalFacts. Allow-list only: nothing else crosses this boundary (SR-I-21). */
export function localFactsFromWooOrder(order, { pluginName, pluginVersion, retrievedAt, rawSha256 = null } = {}) {
  const refs = [...new Set((order?.meta_data ?? []).filter((m) => m?.key === PAYPAL_ORDER_ID_META_KEY && typeof m.value === "string" && m.value).map((m) => m.value))];
  return {
    localOrderId: order?.id == null ? null : String(order.id),
    rawStatus: order?.status ?? null,
    normalizedStatus: normalizeLocalStatus(order?.status),
    total: order?.total ?? null,
    currency: order?.currency ?? null,
    dateCreated: order?.date_created_gmt ?? null,
    dateModified: order?.date_modified_gmt ?? null,
    datePaid: order?.date_paid_gmt ?? null,
    paypalOrderIdRef: refs.length === 1 ? refs[0] : null,
    paypalOrderIdRefCount: refs.length,
    pluginName: pluginName ?? null, pluginVersion: pluginVersion ?? null,
    retrievedAt, rawSha256,
  };
}

/** Returns the `match` object the engine requires. Confirmed only when BOTH sides name each other. */
export function resolveIdentity(paypal, local, { invoicePrefix = null } = {}) {
  const un = (reason) => ({ identity: "unresolved", reason, localCount: 0, paypalCount: 0 });
  if (paypal?.unreadable || local?.unreadable) return un("unreadable");
  const known = RECORDED_PLUGIN_VERSIONS[local?.pluginName] ?? [];
  if (!known.includes(local?.pluginVersion)) return un("plugin_version_not_recorded");
  if (local.paypalOrderIdRefCount > 1) return un("store_has_multiple_paypal_order_ids");
  if (!local.paypalOrderIdRef) {
    // CR-002: PayPal-side corroboration only. NOT confirmed identity; see engine for what a provisional association may conclude.
    const a = toMinor(paypal.unitAmount, paypal.unitCurrency), b = toMinor(local.total, local.currency);
    const ok = paypal.purchaseUnitCount === 1 && paypal.customId && paypal.customId === local.localOrderId
      && typeof paypal.invoiceId === "string" && paypal.invoiceId.endsWith(`-${local.localOrderId}`) && (!invoicePrefix || paypal.invoiceId.startsWith(`${invoicePrefix}-`))
      && a !== null && b !== null && a === b && paypal.unitCurrency === local.currency;
    return ok ? { identity: "provisional", basis: "provisional_association", reason: "store_has_no_paypal_order_id", localCount: 1, paypalCount: 1 } : un("store_has_no_paypal_order_id");
  }
  if (paypal.purchaseUnitCount !== 1) return un("paypal_purchase_unit_count_not_one");
  if (!paypal.customId) return un("paypal_custom_id_missing");
  if (paypal.paypalOrderId !== local.paypalOrderIdRef || paypal.customId !== local.localOrderId) return un("ids_disagree");
  return { identity: "confirmed", localCount: 1, paypalCount: 1 };
}
