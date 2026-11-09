// Deterministic incident engine (SRS 6). No model call, no randomness, no clock, no network.
// Decision table rows are SRS 6.1; first match wins.
import { toMinor, normalizeLocalStatus } from "./normalize.js";
import { stateFingerprint } from "./fingerprint.js";

export const VERDICT = Object.freeze({
  OK: "ok", NOT_APPROVED: "not_approved",
  APPROVED_NOT_CAPTURED: "approved_not_captured",
  APPROVED_NOT_CAPTURED_LOCALLY_CANCELLED: "approved_not_captured_locally_cancelled",
  CAPTURED_LOCAL_UNPAID: "captured_local_unpaid",
  CAPTURED_LOCAL_CANCELLED: "captured_local_cancelled",
  CAPTURE_PENDING: "capture_pending", CAPTURE_DECLINED: "capture_declined",
  MULTIPLE_CAPTURES: "multiple_captures", AMOUNT_MISMATCH: "amount_mismatch", UNKNOWN: "unknown",
});

const REVIEW_ONLY = new Set([VERDICT.MULTIPLE_CAPTURES, VERDICT.AMOUNT_MISMATCH, VERDICT.UNKNOWN, VERDICT.CAPTURED_LOCAL_CANCELLED]);

function actions(verdict, tiers) {
  const safe = [];
  const forbidden = [];
  const forbid = (action, reason, rule) => forbidden.push({ action, reason, rule });
  const allow = (action, reason, rule, requiresApproval = false) => safe.push({ action, reason, rule, requiresApproval });

  // SAF-2 and X2/X3: always forbidden, in every verdict.
  forbid("refund", "Refund workflows are out of scope (X4).", "SAF-2");
  forbid("auto_capture", "Capture is never automatic (X2, X3).", "SAF-1");
  forbid("auto_repair", "No repair is applied without a human approval (BR-05).", "SAF-6");

  if (verdict !== VERDICT.OK && verdict !== VERDICT.NOT_APPROVED) allow("ask_human_to_review", "A person should look at the evidence.", "SAF-4");

  const captureOk = verdict === VERDICT.APPROVED_NOT_CAPTURED && tiers.includes(3);
  if (captureOk) allow("capture_with_approval", "Buyer approved, nothing captured, local order not cancelled. Needs approval, re-verification and a stored request ID.", "SAF-1", true);
  else forbid("capture", verdict === VERDICT.APPROVED_NOT_CAPTURED ? "Capture is not enabled in this build (Tier 3 not built or not enabled)." : "Capture is only ever allowed for approved_not_captured with the local order not cancelled.", "SAF-1");

  if (verdict === VERDICT.CAPTURED_LOCAL_UNPAID && tiers.includes(2)) allow("mark_local_paid", "PayPal shows one completed capture; local order is unpaid.", "SAF-3", true);
  else forbid("mark_local_paid", "Only safe for captured_local_unpaid, and only when Tier 2 is built and enabled.", "SAF-3");

  if (REVIEW_ONLY.has(verdict)) forbid("any_repair", "This verdict allows human review only.", "SAF-4");
  if (verdict === VERDICT.APPROVED_NOT_CAPTURED_LOCALLY_CANCELLED) allow("contact_customer", "Merchant cancelled the order; a person decides.", "SAF-1");
  if (verdict === VERDICT.CAPTURE_PENDING) allow("wait_and_recheck", "Capture is pending; do not treat as paid or failed.", "SAF-4");
  return { safeActions: safe, forbiddenActions: forbidden };
}

/**
 * @param {{paypal:object, local:object, match?:{localCount:number, paypalCount:number}}} input
 * @param {{tiers?:number[]}} opts  tiers enabled in this build. Default [1] (read-only).
 */
export function diagnose(input, opts = {}) {
  const tiers = opts.tiers ?? [1];
  // Event time stays OFF until history source, completeness and status semantics are verified (gated, S0-A).
  const eventTimeVerified = opts.eventTimeVerified === true;
  const { paypal, local } = input;
  const match = input.match;
  const provisional = match?.identity === "provisional";
  const evidence = [];
  const ev = (source, field, value, eventTime = null, retrievedAt = null, rawRef = null) => {
    const id = "EV-" + String(evidence.length + 1).padStart(4, "0");
    evidence.push({ evidenceId: id, source, field, value: value ?? null, eventTime, retrievedAt, rawRef });
    return id;
  };
  // Identity evidence: the exact facts the identity decision used, so a reader can see WHY it is confirmed, provisional or unresolved.
  const identityEvidence = () => {
    const pr = paypal?.retrievedAt ?? null, lr = local?.retrievedAt ?? null, ps = paypal?.rawSha256 ?? null, ls = local?.rawSha256 ?? null;
    ev("paypal", "paypalOrderId", paypal?.paypalOrderId ?? null, null, pr, ps);
    ev("paypal", "purchaseUnitCount", paypal?.purchaseUnitCount ?? null, null, pr, ps);
    ev("paypal", "customId", paypal?.customId ?? null, null, pr, ps);
    ev("paypal", "invoiceId", paypal?.invoiceId ?? null, null, pr, ps);
    ev("paypal", "unitAmount", paypal?.unitAmount == null ? null : `${paypal.unitAmount}:${paypal.unitCurrency}`, null, pr, ps);
    ev("store", "localOrderId", local?.localOrderId ?? null, null, lr, ls);
    ev("store", "paypalOrderIdRef", local?.paypalOrderIdRef ?? null, null, lr, ls);
    ev("store", "paypalOrderIdRefCount", local?.paypalOrderIdRefCount ?? null, null, lr, ls);
    ev("store", "plugin", local?.pluginName ? `${local.pluginName}@${local.pluginVersion}` : null, null, lr, ls);
  };
  const result = (verdict, row, reason, extra = {}) => {
    const a = actions(verdict, tiers);
    // CR-002 item 3: a provisional association never offers an action that needs approval, in any tier.
    if (provisional) {
      for (const x of a.safeActions.filter((x) => x.requiresApproval)) a.forbiddenActions.push({ action: x.action, reason: "Identity is only a provisional association (WooCommerce does not hold the PayPal order ID).", rule: "CR-002" });
      a.safeActions = a.safeActions.filter((x) => !x.requiresApproval);
      if (!a.forbiddenActions.some((x) => x.action === "capture")) a.forbiddenActions.push({ action: "capture", reason: "Identity is only a provisional association; capture is never offered on it.", rule: "CR-002" });
      if (!a.forbiddenActions.some((x) => x.action === "mark_local_paid")) a.forbiddenActions.push({ action: "mark_local_paid", reason: "Identity is only a provisional association.", rule: "CR-002" });
    }
    return {
      verdict, ruleRow: row, reason,
      // NOT a probability and NOT confidence in the real-world diagnosis. It only says whether a decision-table row
      // matched ("rule_matched") or the engine declined to decide ("abstain"). Real-world reliability is unmeasured.
      decisionStatus: verdict === VERDICT.UNKNOWN ? "abstain" : "rule_matched",
      evidence, divergencePoint: extra.divergencePoint ?? null, finding: extra.finding ?? null,
      ...a,
      stateFingerprint: stateFingerprint(paypal, local, verdict, match),
      identityBasis: match?.identity === "confirmed" ? "confirmed" : provisional ? "provisional_association" : null,
      injected: Boolean(local?.injected || paypal?.injected),
    };
  };

  // Row 1: unreadable
  if (paypal?.unreadable || local?.unreadable) {
    const which = paypal?.unreadable ? "paypal" : "store";
    ev(which, "readError", (paypal?.unreadable ? paypal.readError : local.readError) ?? "unreadable");
    return result(VERDICT.UNKNOWN, 1, `unreadable:${which}`, { divergencePoint: abstainDp("unreadable") });
  }
  // CR-002 item 2: under a provisional association only the two approved-not-captured verdicts are allowed; anything else abstains.
  if (provisional && !input.__inner) {
    const r = diagnose({ paypal, local, match: { localCount: 1, paypalCount: 1, identity: "provisional" }, __inner: true }, opts);
    const allowed = [VERDICT.APPROVED_NOT_CAPTURED, VERDICT.APPROVED_NOT_CAPTURED_LOCALLY_CANCELLED];
    if (allowed.includes(r.verdict)) return r;
    return diagnose({ paypal, local, match: { identity: "unresolved", reason: `provisional_association_not_sufficient:${r.verdict}` } }, opts);
  }
  // Row 2: ambiguous, or no match evidence supplied. Missing linkage never implies a unique match.
  // CR-001 item 2: unresolved identity is a finding, never "healthy" and never an incident.
  if (match?.identity === "unresolved") {
    ev("engine", "identity", `unresolved:${match.reason}`);
    identityEvidence();
    return result(VERDICT.UNKNOWN, 2, `link_unresolved:${match.reason}`, { divergencePoint: abstainDp("link_unresolved"), finding: "Unable to link this WooCommerce order to a PayPal order using the available evidence." });
  }
  if (!match || !Number.isInteger(match.localCount) || !Number.isInteger(match.paypalCount) || match.localCount < 1 || match.paypalCount < 1) {
    ev("engine", "matchCounts", match ? JSON.stringify(match) : "not_provided");
    return result(VERDICT.UNKNOWN, 2, "missing_match_evidence", { divergencePoint: abstainDp("missing_match_evidence") });
  }
  if (match.localCount > 1 || match.paypalCount > 1) {
    ev("engine", "matchCounts", `local=${match.localCount};paypal=${match.paypalCount}`);
    return result(VERDICT.UNKNOWN, 2, "ambiguous_match", { divergencePoint: abstainDp("ambiguous_match") });
  }

  identityEvidence();
  const captures = paypal?.captures ?? [];
  const st = paypal?.orderStatus;
  const ls = local?.normalizedStatus;
  const idOrder = ev("paypal", "orderStatus", st ?? null, null, paypal?.retrievedAt ?? null, paypal?.rawSha256 ?? null);
  const idCaps = ev("paypal", "captureCount", captures.length, null, paypal?.retrievedAt ?? null, paypal?.rawSha256 ?? null);
  const capIds = captures.map((c, i) => ev("paypal", `captures[${i}]`, `${c.id}:${c.status}:${c.amount}:${c.currency}`, c.createTime ?? null, paypal?.retrievedAt ?? null, paypal?.rawSha256 ?? null));
  const idLocal = ev("store", "normalizedStatus", ls ?? null, null, local?.retrievedAt ?? null, local?.rawSha256 ?? null);
  ev("store", "rawStatus", local?.rawStatus ?? null, null, local?.retrievedAt ?? null, local?.rawSha256 ?? null);
  const idTotal = ev("store", "total", local ? `${local.total}:${local.currency}` : null, null, local?.retrievedAt ?? null, local?.rawSha256 ?? null);

  if (provisional) ev("engine", "identityBasis", `provisional_association:order=${local.localOrderId}`);
  // Row 3: multiple captures
  if (captures.length > 1) return result(VERDICT.MULTIPLE_CAPTURES, 3, `PayPal lists ${captures.length} captures on one order.`);
  // Row 4: required state missing or unrecognised
  if (!st || !ls || ls === "unknown") return result(VERDICT.UNKNOWN, 4, "missing_or_unrecognised_state", { divergencePoint: abstainDp("insufficient_state") });

  const cap = captures[0] ?? null;
  const capDone = cap?.status === "COMPLETED";
  // Row 5: amount mismatch (single completed capture only; X13)
  if (st === "COMPLETED" && capDone) {
    const a = toMinor(cap.amount, cap.currency);
    const b = toMinor(local.total, local.currency);
    if (a === null || b === null) return result(VERDICT.UNKNOWN, 5, "unparseable_amount", { divergencePoint: abstainDp("insufficient_state") });
    if (a !== b || cap.currency !== local.currency) return result(VERDICT.AMOUNT_MISMATCH, 5, "capture amount or currency differs from local total");
    // Rows 6-8
    if (ls === "paid") return result(VERDICT.OK, 6, "captured and paid locally");
    if (ls === "unpaid" || ls === "on_hold" || ls === "failed") return result(VERDICT.CAPTURED_LOCAL_UNPAID, 7, "capture completed; local order not paid", { divergencePoint: divergence(paypal, local, cap, [capIds[0], idLocal], eventTimeVerified) });
    if (ls === "cancelled") return result(VERDICT.CAPTURED_LOCAL_CANCELLED, 8, "capture completed; local order cancelled");
  }
  // Rows 9-10
  if (cap?.status === "PENDING") return result(VERDICT.CAPTURE_PENDING, 9, "capture pending");
  if (cap && (cap.status === "DECLINED" || cap.status === "FAILED")) return result(VERDICT.CAPTURE_DECLINED, 10, "capture did not succeed");
  // Rows 11-12
  if (st === "APPROVED" && captures.length === 0) {
    if (ls === "cancelled") return result(VERDICT.APPROVED_NOT_CAPTURED_LOCALLY_CANCELLED, 11, "approved; nothing captured; local cancelled", { divergencePoint: observed(paypal, local, [idOrder, idCaps, idLocal]) });
    return result(VERDICT.APPROVED_NOT_CAPTURED, 12, "approved; nothing captured", { divergencePoint: observed(paypal, local, [idOrder, idCaps, idLocal]) });
  }
  // Row 13
  if ((st === "CREATED" || st === "PAYER_ACTION_REQUIRED") && captures.length === 0) return result(VERDICT.NOT_APPROVED, 13, "buyer has not approved");
  // Row 14
  return result(VERDICT.UNKNOWN, 14, "unhandled_combination", { divergencePoint: abstainDp("insufficient_state") });
}

const abstainDp = (reason) => ({ kind: "abstain", reason });

/** SRS SR-F-11. Observation time only, unless event/history evidence exists. */
function observed(paypal, local, evidenceIds) {
  const t = [paypal?.retrievedAt, local?.retrievedAt].filter(Boolean).sort().pop();
  if (!t) return abstainDp("missing_timestamp");
  return { kind: "observed", timeKind: "observed", time: t, statement: `disagreement observed at ${t}`, evidenceIds };
}
function divergence(paypal, local, cap, evidenceIds, eventTimeVerified) {
  // Event time only when explicitly enabled AND the store declares its history complete. Absence of a paid entry
  // is not proof; statuses are compared after normalization (raw WooCommerce history would say processing/completed).
  const hist = local?.statusHistory;
  if (eventTimeVerified && local?.statusHistoryComplete === true && cap?.createTime && Array.isArray(hist) && hist.length > 0 && hist.every((h) => h.time && h.status)) {
    const paidAfter = hist.some((h) => normalizeLocalStatus(h.status) === "paid" && h.time >= cap.createTime);
    if (!paidAfter) {
      return { kind: "event", timeKind: "event", time: cap.createTime, statement: `PayPal recorded the capture at ${cap.createTime}; store history shows no paid status since`, evidenceIds };
    }
  }
  return observed(paypal, local, evidenceIds);
}
