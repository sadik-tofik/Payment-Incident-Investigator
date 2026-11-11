// SRS 7. The engine supplies every fact. The model may only rephrase. Anything not grounded falls back to the template.
// A valid evidence ID does NOT prove a statement is true (SR-F-22a); the grounding check below is a guard, not proof.
import { VERDICT } from "./engine.js";

export const FORBIDDEN_PHRASES = [/\broot cause\b/i, /\bcaused by\b/i, /\bguarantee[sd]?\b/i, /\bprevent(s|ed)?\b/i, /\beliminat(e|es|ed)\b/i, /\bzero\b/i, /\bautonomous(ly)?\b/i, /\balways\b/i, /\bnever\b/i, /\bfully\b/i, /\binstantly\b/i, /production-ready/i];

/** Only structured engine output goes to the model (SR-F-20). */
export function buildModelInput(result) {
  return {
    verdict: result.verdict, reason: result.reason, decisionStatus: result.decisionStatus,
    divergencePoint: result.divergencePoint,
    evidence: result.evidence.map(({ evidenceId, source, field, value, eventTime }) => ({ evidenceId, source, field, value, eventTime })),
    safeActions: result.safeActions.map((a) => a.action),
    forbiddenActions: result.forbiddenActions.map((a) => a.action),
  };
}

const T = {
  [VERDICT.OK]: "PayPal shows the capture as completed and the store shows the order as paid.",
  [VERDICT.NOT_APPROVED]: "At the time of the read, PayPal showed the order as not yet approved, and no capture was recorded. This result does not establish why the order was in that state.",
  [VERDICT.APPROVED_NOT_CAPTURED]: "PayPal shows the buyer approved the order, but no capture is recorded. The store order is not cancelled.",
  [VERDICT.APPROVED_NOT_CAPTURED_LOCALLY_CANCELLED]: "PayPal shows the buyer approved the order and no capture is recorded, but the store order is cancelled. A person must decide.",
  [VERDICT.CAPTURED_LOCAL_UNPAID]: "PayPal shows one completed capture, but the store order is not marked paid.",
  [VERDICT.CAPTURED_LOCAL_CANCELLED]: "PayPal shows a completed capture, but the store order is cancelled. A person must review.",
  [VERDICT.CAPTURE_PENDING]: "At the time of the read, PayPal listed this capture as pending. This result does not establish whether or when it will complete.",
  [VERDICT.CAPTURE_DECLINED]: "PayPal shows the capture did not succeed.",
  [VERDICT.MULTIPLE_CAPTURES]: "PayPal lists more than one capture on this order. A person must review.",
  [VERDICT.AMOUNT_MISMATCH]: "The captured amount or currency differs from the store order total. A person must review.",
  [VERDICT.UNKNOWN]: "The evidence is not sufficient to diagnose this order.",
};

/** SR-F-23: a deterministic explanation exists for every verdict. Cites evidence IDs. */
export function templateExplanation(result) {
  const ids = result.evidence.map((e) => e.evidenceId);
  let first = result.finding ?? T[result.verdict] ?? T[VERDICT.UNKNOWN];
  if (!result.finding && result.verdict === VERDICT.NOT_APPROVED) {   // name the status actually observed (grounded in evidence), never a guess
    const st = result.evidence.find((e) => e.field === "orderStatus")?.value;
    if (st) first = `At the time of the read, PayPal showed the order as ${st}, and no capture was recorded. This result does not establish why the order was in that state.`;
  }
  const statements = [{ text: first, evidenceIds: ids }];
  if (result.identityBasis === "provisional_association") { const n = result.evidence.find((e) => e.field === "identityBasis"); const num = String(n?.value ?? "").split("order=")[1] ?? ""; statements.push({ text: `PayPal order appears associated with WooCommerce order ${num} based on PayPal-side identifiers and matching amount and currency. WooCommerce does not contain the PayPal order ID, so identity is not confirmed.`, evidenceIds: n ? [n.evidenceId] : ids }); }
  if (result.divergencePoint?.statement) statements.push({ text: result.divergencePoint.statement + ".", evidenceIds: result.divergencePoint.evidenceIds ?? ids });
  return { source: "template", abstained: result.verdict === VERDICT.UNKNOWN, summary: statements[0].text, statements };
}

function groundedCorpus(result) {
  const parts = [result.verdict, result.reason, result.divergencePoint?.time ?? "", result.divergencePoint?.statement ?? ""];
  for (const e of result.evidence) parts.push(String(e.value ?? ""), e.eventTime ?? "", e.evidenceId);
  for (const a of [...result.safeActions, ...result.forbiddenActions]) parts.push(a.action);
  return parts.join(" | ");
}
const VALUE_TOKENS = /[A-Z][A-Z_]{3,}|\d[\d.:\-TZ+]*\d|\d/g;

/** SR-F-22 and SR-F-22a. Returns {ok, problems[]}. */
export function validateExplanation(expl, result) {
  const problems = [];
  const ids = new Set(result.evidence.map((e) => e.evidenceId));
  if (!expl || typeof expl !== "object" || !Array.isArray(expl.statements) || typeof expl.abstained !== "boolean") return { ok: false, problems: ["schema"] };
  if (result.verdict === VERDICT.UNKNOWN && !expl.abstained) problems.push("must_abstain_on_unknown");
  const corpus = groundedCorpus(result);
  for (const [i, s] of expl.statements.entries()) {
    if (typeof s?.text !== "string" || !Array.isArray(s.evidenceIds) || s.evidenceIds.length === 0) { problems.push(`statement_${i}:no_evidence_ids`); continue; }
    for (const id of s.evidenceIds) if (!ids.has(id)) problems.push(`statement_${i}:unknown_evidence_id:${id}`);
    for (const re of FORBIDDEN_PHRASES) if (re.test(s.text)) problems.push(`statement_${i}:forbidden_phrase:${re.source}`);
    const safe = s.text.replace(/EV-\d{4}/g, "");
    for (const tok of safe.match(VALUE_TOKENS) ?? []) if (!corpus.includes(tok)) problems.push(`statement_${i}:ungrounded_value:${tok}`);
  }
  return { ok: problems.length === 0, problems };
}

/**
 * modelFn(structuredInput) -> Promise<explanation>. Timeout, error or rejection yields the template (SR-I-30).
 * Never throws. Never gives the model anything but buildModelInput(result).
 */
export async function explain(result, modelFn = null, { timeoutMs = 25000 } = {}) {
  const template = templateExplanation(result);
  if (!modelFn) return { ...template, aiStatus: "not_configured" };
  const started = Date.now();
  try {
    const out = await Promise.race([
      modelFn(buildModelInput(result)),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), timeoutMs)),
    ]);
    const v = validateExplanation(out, result);
    if (!v.ok) return { ...template, aiStatus: "rejected", problems: v.problems, latencyMs: Date.now() - started, modelInfo: modelFn.info ?? null };
    return { ...out, source: "ai", aiStatus: "accepted", latencyMs: Date.now() - started, modelInfo: modelFn.info ?? null };
  } catch (e) {
    return { ...template, aiStatus: String(e?.message) === "timeout" ? "timeout" : "error", errorCode: String(e?.message).slice(0, 60), latencyMs: Date.now() - started, modelInfo: modelFn.info ?? null };
  }
}
