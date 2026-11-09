// SRS 4.1: fixed lookup. Unrecognised raw status becomes "unknown", never a guess.
// NOTE (gated, S0-A / S0-D): which WooCommerce status really means "paid" for a PayPal order is
// reference-store semantics here. It is NOT verified against a real WooCommerce install.
const MAP = { processing: "paid", completed: "paid", pending: "unpaid", "on-hold": "on_hold", failed: "failed", cancelled: "cancelled" };
export const normalizeLocalStatus = (raw) => MAP[raw] ?? "unknown";

// Only currencies whose precision we have decided to support. Anything else is "unknown", never guessed.
const SUPPORTED = { USD: 2, EUR: 2, GBP: 2, CAD: 2, AUD: 2, JPY: 0 };
/** Decimal string to integer minor units. Returns null if unparseable. No floating point (SR-D-02). */
export function toMinor(amount, currency) {
  if (typeof amount !== "string" && typeof amount !== "number") return null;
  const m = /^(\d+)(?:\.(\d+))?$/.exec(String(amount).trim());
  if (!m) return null;
  const exp = SUPPORTED[currency];
  if (exp === undefined) return null;
  const frac = m[2] ?? "";
  if (frac.length > exp && /[1-9]/.test(frac.slice(exp))) return null;
  return BigInt(m[1] + frac.slice(0, exp).padEnd(exp, "0"));
}
