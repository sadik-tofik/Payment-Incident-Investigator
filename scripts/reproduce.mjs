// Re-runs the deterministic engine on a stored evidence bundle and compares with what was recorded. Usage: node scripts/reproduce.mjs <bundle.json>
// Exit 0 = same verdict, row, reason, status, fingerprint and evidence list. This shows the DECISION follows from the stored inputs.
// It does NOT show the inputs equal what PayPal or the store held at the time.
import { readFileSync } from "node:fs";
import { diagnose } from "../app/src/engine.js";
import { canonical } from "../app/src/canonical.js";

export const REQUIRED_EXPECTED = ["verdict", "ruleRow", "reason", "decisionStatus", "stateFingerprint", "evidence"];

export function reproduce(bundle) {
  if (bundle?.bundleSpec !== "evidence-bundle-1") return { ok: false, problems: ["unknown_bundle_spec"] };
  // Every recorded expectation must be present: a bundle that omits one must FAIL, not pass unchecked (reviewer finding, 5 Nov).
  const missing = REQUIRED_EXPECTED.filter((k) => !(bundle.expected && k in bundle.expected));
  if (missing.length || !bundle.inputs || !bundle.engineOptions) return { ok: false, problems: [...missing.map((k) => `expected_missing:${k}`), ...(!bundle.inputs ? ["inputs_missing"] : []), ...(!bundle.engineOptions ? ["engineOptions_missing"] : [])] };
  const r = diagnose(bundle.inputs, bundle.engineOptions);
  const got = { verdict: r.verdict, ruleRow: r.ruleRow, reason: r.reason, decisionStatus: r.decisionStatus, stateFingerprint: r.stateFingerprint, evidence: r.evidence.map(({ evidenceId, source, field, value }) => ({ evidenceId, source, field, value })) };
  const problems = REQUIRED_EXPECTED.filter((k) => canonical(bundle.expected[k]) !== canonical(got[k]));
  return { ok: problems.length === 0, problems, got };
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const res = reproduce(JSON.parse(readFileSync(process.argv[2], "utf8")));
  console.log(res.ok ? `REPRODUCED: ${res.got.verdict} (row ${res.got.ruleRow}), fingerprint ${res.got.stateFingerprint}` : `MISMATCH in: ${res.problems.join(", ")}`);
  process.exit(res.ok ? 0 : 1);
}
