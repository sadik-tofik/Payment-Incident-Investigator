// One investigation (PDR 3.2). READ-ONLY. Contract: docs/05a-API-CONTRACT.md. No network code here; readers are injected.
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { canonical, sha256 } from "./canonical.js";
import { diagnose } from "./engine.js";
import { resolveIdentity } from "./identity.js";
import { explain } from "./explain.js";

export const ORDER_ID_PATTERN = /^[A-Z0-9]{10,30}$/;   // assumption from the IDs seen; configurable, not a PayPal rule
export const PROVISIONAL_NOTICE = (n) => `PayPal order appears associated with WooCommerce order ${n} based on PayPal-side identifiers and matching amount and currency. WooCommerce does not contain the PayPal order ID, so identity is not confirmed.`;
const LABELS = { replay: "recorded real sandbox capture", live: "live sandbox", injected: "injected (not a real merchant incident)" };
const LIMITS = {
  replay: ["Recorded real sandbox capture: one plugin version (4.2.0), one interruption method, virtual product, USD.", "Plugin version is operator-declared, not read from the store.", "Retrieval time is the recording time, not now."],
  live: ["Live sandbox read: one plugin version recorded (4.2.0); other versions are refused.", "Plugin version is operator-declared, not read from the store."],
  injected: ["Injected case: not a real merchant incident.", "Shows how the engine decides; says nothing about how often such cases occur."],
};

export const HASH_SPEC = { hashSpec: "sha256 of canonical-json-v1 (sorted keys, no whitespace)", paypal: "redacted copy of PayPal's response (not PayPal's original bytes)", store: "allow-listed LocalFacts object (not the original WooCommerce response)", establishesAuthenticity: false, note: "A hash identifies the stored copy. It does not prove PayPal or the store said it." };
export const buildVersion = () => JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;

export class ApiError extends Error {
  constructor(status, code, message, extra = {}) { super(message); Object.assign(this, { status, code }, extra); }
}

function upstream(system, facts) {
  const e = String(facts.readError ?? "");
  const partial = { system, reason: e, retrievedAt: facts.retrievedAt ?? null };
  if (/HTTP 40[13]\b/.test(e)) return new ApiError(502, "upstream_auth_rejected", `${system} rejected the configured credentials. The operator must fix the key; nothing was retried with broader permissions.`, { partial });
  if (system === "paypal" && /HTTP 404 RESOURCE_NOT_FOUND/.test(e)) return new ApiError(404, "paypal_order_not_found", "PayPal reported that no order with that ID exists in this environment.", { partial });
  if (system === "store" && /HTTP 404 ORDER_NOT_FOUND/.test(e)) return new ApiError(404, "store_order_not_found", "The store reported that no order with that number exists.", { partial });
  if (/HTTP 404\b/.test(e)) return new ApiError(502, "upstream_bad_response", `${system} answered 404 without the expected not-found body (wrong address or an intermediary).`, { partial });
  if (/HTTP 2\d\d/.test(e) || /unparseable/.test(e)) return new ApiError(502, "upstream_bad_response", `${system} returned a response that could not be used.`, { partial });
  return new ApiError(502, "upstream_unreachable", `${system} could not be read.`, { partial });
}

const ppFacts = (p) => p && !p.unreadable ? { status: p.orderStatus, retrievedAt: p.retrievedAt, eventTime: null, timeKind: "observed", amount: p.unitAmount, currency: p.unitCurrency, captures: p.captures.map((c) => ({ id: c.id, status: c.status, createTime: c.createTime })) } : null;
const storeFacts = (l, plugin) => l && !l.unreadable ? { localOrderId: l.localOrderId, status: l.rawStatus, normalizedStatus: l.normalizedStatus, retrievedAt: l.retrievedAt, eventTime: null, timeKind: "observed", amount: l.total, currency: l.currency, holdsPayPalOrderId: l.paypalOrderIdRef != null, pluginVersion: plugin.version, pluginVersionSource: plugin.source } : null;

/**
 * deps: { paypal:{getOrder}, store:{getOrderByLocalId}, audit?:AuditLog, explainFn?, plugin:{name,version,source}, invoicePrefix?, deadlineMs?, now? }
 * Throws ApiError for 400/404/502/504. A completed investigation (including abstention) is returned.
 */
export async function investigate(input, deps) {
  const { mode } = input;
  if (!LABELS[mode]) throw new ApiError(400, "invalid_body", "mode must be replay, live or injected");
  const { paypalOrderId, localOrderId } = input;
  if (paypalOrderId == null && localOrderId == null) throw new ApiError(400, "invalid_body", "paypalOrderId or localOrderId required");
  if (paypalOrderId != null && !(ORDER_ID_PATTERN.test(String(paypalOrderId)) || deps.allowAnyId === true)) throw new ApiError(400, "invalid_order_id", "PayPal order ID has an unexpected format");
  if (localOrderId != null && !/^\d{1,12}$/.test(String(localOrderId))) throw new ApiError(400, "invalid_body", "localOrderId must be a WooCommerce order number");

  let timer;
  const deadline = new Promise((_, rej) => { timer = setTimeout(() => rej(new ApiError(504, "deadline_exceeded", "Investigation did not finish within the deadline.")), deps.deadlineMs ?? 30000); });
  try { return await Promise.race([run(input, deps), deadline]); }
  catch (e) { auditFailure(deps, input, e); throw e; }
  finally { clearTimeout(timer); }
}

function auditFailure(deps, input, e) {
  if (e instanceof ApiError && (e.status >= 500 || e.code === "paypal_order_not_found" || e.code === "store_order_not_found") && deps.audit) { try { e.auditId = deps.audit.append("investigation_failed", { input: { paypalOrderId: input.paypalOrderId ?? null, localOrderId: input.localOrderId ?? null, mode: input.mode }, code: e.code, partial: e.partial ?? null }).hash; } catch { /* audit refusal must not mask the original error */ } }
}

async function run(input, deps) {
  const { mode } = input; const now = deps.now ? deps.now() : new Date();
  const plugin = deps.plugin; let local = null, paypal = null, ppId = input.paypalOrderId ?? null;
  const needs = {};

  if (ppId == null) {   // secondary entry: local order number only
    local = await deps.store.getOrderByLocalId(input.localOrderId);
    if (local.unreadable) throw upstream("store", local);
    if (local.paypalOrderIdRef) ppId = local.paypalOrderIdRef;
    else {
      const match = { identity: "unresolved", reason: "store_has_no_paypal_order_id", localCount: 0, paypalCount: 0 };
      needs.paypalOrderId = true;
      return finish({ mode, input, deps, now, plugin, paypal: { retrievedAt: local.retrievedAt, captures: [], paypalOrderId: null }, local, match, needs, noPayPal: true });
    }
  }
  paypal = await deps.paypal.getOrder(ppId);
  if (paypal.unreadable) throw upstream("paypal", paypal);

  if (local == null) {
    const lid = input.localOrderId ?? paypal.customId;
    if (lid == null || !/^\d{1,12}$/.test(String(lid))) {
      return finish({ mode, input, deps, now, plugin, paypal, local: { localOrderId: null, retrievedAt: paypal.retrievedAt, rawSha256: null }, match: { identity: "unresolved", reason: "paypal_custom_id_missing", localCount: 0, paypalCount: 0 }, needs, noStore: true });
    }
    local = await deps.store.getOrderByLocalId(lid);
    if (local.unreadable) throw upstream("store", local);
  }
  const match = resolveIdentity(paypal, local, { invoicePrefix: deps.invoicePrefix ?? null });
  return finish({ mode, input, deps, now, plugin, paypal, local, match, needs });
}

async function finish({ mode, input, deps, now, plugin, paypal, local, match, needs, noPayPal = false, noStore = false }) {
  const result = diagnose({ paypal, local, match }, { tiers: [1] });
  const expl = await explain(result, deps.explainFn ?? null);
  const hashes = { paypal: noPayPal ? null : sha256(canonical(paypal.redactedRaw ?? null)), store: noStore || !local?.localOrderId ? null : sha256(canonical({ ...local })) };
  const evidence = result.evidence.map((e) => ({ id: e.evidenceId, source: e.source, field: e.field, value: e.value, observedAt: e.retrievedAt, eventTime: e.eventTime, rawHash: e.source === "paypal" ? hashes.paypal : e.source === "store" ? hashes.store : null }));
  const id = "inv_" + randomUUID();
  const conf = match.identity === "confirmed" ? "confirmed" : match.identity === "provisional" ? "provisional_association" : "unresolved";
  const inv = {
    id, createdAt: now.toISOString(),
    source: { mode, label: LABELS[mode] },
    input: { paypalOrderId: input.paypalOrderId ?? null, localOrderId: input.localOrderId ?? null },
    identity: { state: conf, basis: conf === "confirmed" ? "both systems name each other" : conf === "provisional_association" ? "PayPal-side identifiers and matching amount and currency only" : "not established", reason: match.reason ?? null, requiredNotice: conf === "provisional_association" ? PROVISIONAL_NOTICE(local.localOrderId) : null },
    needs,
    systems: { paypal: ppFacts(noPayPal ? null : paypal), store: storeFacts(noStore ? null : local, plugin) },
    decision: { decisionStatus: result.decisionStatus, verdict: result.verdict, ruleRow: result.ruleRow, reason: result.reason, finding: result.finding, divergencePoint: result.divergencePoint, stateFingerprint: result.stateFingerprint },
    evidence,
    // humanActionOnly: a suggestion for a person. It never means approved, authorised or executed. Nothing in this API executes anything.
    actions: { safe: result.safeActions.map((a) => ({ id: a.action, label: a.reason, rule: a.rule, humanActionOnly: true })), forbidden: result.forbiddenActions.map((a) => ({ id: a.action, reason: a.reason, rule: a.rule })) },
    integrity: HASH_SPEC,
    explanation: { kind: expl.source === "ai" ? "ai_validated" : "template", text: expl.statements.map((s) => s.text).join(" "), statements: expl.statements, citedEvidence: [...new Set(expl.statements.flatMap((s) => s.evidenceIds ?? []))], aiStatus: expl.aiStatus, aiRejected: expl.aiStatus === "rejected" },
    limits: LIMITS[mode],
  };
  // Evidence bundle: everything the engine consumed (redacted PayPal facts, allow-listed store facts, identity result), so another
  // reviewer can re-run the decision offline (scripts/reproduce.mjs). It does NOT prove the inputs matched what PayPal or the store held.
  const bundle = { bundleSpec: "evidence-bundle-1", investigationId: id, mode, createdAt: inv.createdAt, engineOptions: { tiers: [1] }, inputs: { paypal, local, match }, expected: { verdict: result.verdict, ruleRow: result.ruleRow, reason: result.reason, decisionStatus: result.decisionStatus, stateFingerprint: result.stateFingerprint, evidence: result.evidence.map(({ evidenceId, source, field, value }) => ({ evidenceId, source, field, value })) } };
  const bundleText = JSON.stringify(bundle, null, 2) + "\n";
  const bundleSha256 = sha256(bundleText);
  if (deps.bundleDir) { mkdirSync(deps.bundleDir, { recursive: true }); writeFileSync(`${deps.bundleDir}/${id}.json`, bundleText); }
  if (deps.audit) inv.auditId = deps.audit.append("investigation", { ai: { status: expl.aiStatus, model: expl.modelInfo ?? null, latencyMs: expl.latencyMs ?? null, problems: expl.problems ?? null, errorCode: expl.errorCode ?? null }, id, input: inv.input, mode, identity: conf, verdict: result.verdict, stateFingerprint: result.stateFingerprint, rawHashes: hashes, bundleSha256 }).hash;
  return inv;
}

/**
 * Turns an API request body into investigate() input. Rules (contract section 2):
 * caseId is exclusive: combining it with paypalOrderId or localOrderId is 400 invalid_body; caseId with mode "live" is 400;
 * the case must belong to the requested mode. cases = { replay: (id) => input|null, injected: (id) => input|null }.
 */
export function prepareInput(body, cases = {}) {
  const bad = (m) => new ApiError(400, "invalid_body", m);
  if (!body || typeof body !== "object") throw bad("body must be an object");
  const { mode, caseId, paypalOrderId, localOrderId } = body;
  if (!LABELS[mode]) throw bad("mode must be replay, live or injected");
  if (caseId == null) return { mode, paypalOrderId, localOrderId };
  if (paypalOrderId != null || localOrderId != null) throw bad("caseId cannot be combined with paypalOrderId or localOrderId");
  if (mode === "live") throw bad("caseId cannot be used with mode live");
  const c = cases[mode]?.(String(caseId)) ?? null;
  if (!c) throw new ApiError(400, "unknown_case", "no such case for this mode");
  return { mode, ...c };
}

/** Error body for the API layer (contract section 4). */
export function errorBody(e) {
  if (e instanceof ApiError) return { status: e.status, body: { error: { code: e.code, message: e.message }, ...(e.partial !== undefined ? { partial: e.partial } : e.code === "deadline_exceeded" ? { partial: null } : {}), auditId: e.auditId ?? null } };
  return { status: 500, body: { error: { code: "internal_error", message: "internal error" }, auditId: null } };
}
