import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { audit, classify } from "../../scripts/claims-audit.mjs";

const REAL = fileURLToPath(new URL("../../", import.meta.url));
function sandbox(readme, mutate) {
  const d = mkdtempSync(join(tmpdir(), "claims-"));
  mkdirSync(join(d, "docs/ui-fixtures"), { recursive: true });
  cpSync(join(REAL, "docs/06-EVIDENCE-SPEC.md"), join(d, "docs/06-EVIDENCE-SPEC.md"));
  const reg = JSON.parse(readFileSync(join(REAL, "docs/claims-register.json"), "utf8"));
  if (mutate) mutate(reg, d);
  writeFileSync(join(d, "docs/claims-register.json"), JSON.stringify(reg));
  const required = reg.requiredInReadme.join(". ") + ".";
  writeFileSync(join(d, "README.md"), `${required}\n\n${readme}\n`);
  return d;
}
const rules = (d) => audit({ root: d }).findings.map((f) => f.rule + ":" + f.msg);

test("SR-F-62 claims audit: the real repository passes", () => {
  const { findings } = audit({ root: REAL });
  assert.deepEqual(findings, []);
});
test("SR-F-62 claims audit: a public file citing a claim that is not PROVEN fails", () => {
  for (const id of ["C-01", "C-04", "C-05", "C-06"]) assert.ok(rules(sandbox(`We do this (${id}).`)).some((m) => m.startsWith("B:") && m.includes(id)), id);
  assert.ok(rules(sandbox("Cites C-99.")).some((m) => m.includes("unknown claim C-99")));
  assert.deepEqual(rules(sandbox("Cites C-10 and C-11.")), []);
});
test("SR-F-62 claims audit: avoid-list words fail unless a negation precedes them in the same sentence", () => {
  for (const s of ["It is production-ready.", "AI finds the root cause.", "Guarantees safe payments.", "It is tamper-proof.", "Always correct.", "It reconciles your orders.", "Zero duplicate charges."])
    assert.ok(rules(sandbox(s)).some((m) => m.startsWith("C:")), s);
  assert.deepEqual(rules(sandbox("This is not production-ready. It does not find the root cause.")), []);
  assert.ok(rules(sandbox("Not great. It is production-ready.")).some((m) => m.startsWith("C:")), "negation in another sentence does not count");
});
test("SR-F-62 claims audit: 'read-only' needs the qualification in the same paragraph", () => {
  assert.ok(rules(sandbox("A read-only tool.")).some((m) => m.startsWith("D:")));
  assert.deepEqual(rules(sandbox("A tool that is read-only with respect to PayPal and WooCommerce.")), []);
});
test("SR-F-62 claims audit: a missing README disclosure fails", () => {
  const d = sandbox("Hello.", (reg) => { reg.requiredInReadme = ["Demo Honesty Ledger", "a phrase that is absent"]; });
  writeFileSync(join(d, "README.md"), "Demo Honesty Ledger only.\n");
  assert.ok(rules(d).some((m) => m.startsWith("E:") && m.includes("a phrase that is absent")));
});
test("SR-F-62 claims audit: register and Evidence Spec section 10 must agree", () => {
  const d = sandbox("Hello.", (reg) => { reg.claims["C-06"].status = "PROVEN"; delete reg.claims["C-13"]; reg.claims["C-77"] = { status: "PROVEN" }; });
  const r = rules(d);
  assert.ok(r.some((m) => m.startsWith("A:") && m.includes("C-06")));
  assert.ok(r.some((m) => m.startsWith("A:") && m.includes("C-13")));
  assert.ok(r.some((m) => m.startsWith("A:") && m.includes("C-77")));
});
test("SR-F-62 claims audit: forbidden wording in a UI fixture string fails unless a reasoned exception is registered", () => {
  const mk = (reg) => { reg.fixtureExceptions = []; };
  const d = sandbox("Hello.", mk);
  writeFileSync(join(d, "docs/ui-fixtures/x.json"), JSON.stringify({ a: { text: "This guarantees recovery." } }));
  assert.ok(rules(d).some((m) => m.includes("guarantees")));
  const d2 = sandbox("Hello.", (reg) => { reg.fixtureExceptions = [{ phrase: "guarantees", reason: "" }]; });
  writeFileSync(join(d2, "docs/ui-fixtures/x.json"), JSON.stringify({ text: "This guarantees recovery." }));
  assert.ok(rules(d2).some((m) => m.includes("guarantees")), "an exception without a reason does not count");
});
test("SR-F-62 claims audit: status classifier handles the Evidence Spec wordings", () => {
  assert.deepEqual(classify("**PARTIAL**"), ["PARTIAL"]);
  assert.deepEqual(classify("PARTIAL / UNPROVEN").sort(), ["PARTIAL", "UNPROVEN"]);
  assert.deepEqual(classify("**FORBIDDEN**"), ["FORBIDDEN"]);
  assert.deepEqual(classify("**UNPROVEN / not built**"), ["UNPROVEN"]);
  assert.deepEqual(classify("**PROVEN narrow**"), ["PROVEN"]);
  assert.deepEqual(classify("**V for that one order**"), ["PROVEN"]);
});
test("SR-F-62 claims audit: an unresolved placeholder in public text fails (submission gate)", () => {
  assert.ok(rules(sandbox("Ran on [LIVE-RUN: add model name].")).some((m) => m.startsWith("F:")));
  assert.ok(rules(sandbox("Output: [PASTE THE JSON OUTPUT HERE]")).some((m) => m.startsWith("F:")));
  assert.deepEqual(rules(sandbox("No placeholders here.")), []);
});
test("SR-F-62 claims audit: drafts are checked for wording, placeholders there are notes, and the same file fails once moved to docs/", () => {
  const d = sandbox("Hello.");
  mkdirSync(join(d, "docs/drafts"), { recursive: true });
  writeFileSync(join(d, "docs/drafts/DEVPOST.md"), "It is production-ready. Run: [LIVE-RUN: x]");
  let r = audit({ root: d }); assert.ok(r.findings.some((f) => f.rule === "C")); assert.equal(r.notes.length, 1);
  writeFileSync(join(d, "docs/drafts/DEVPOST.md"), "Fine text. Run: [LIVE-RUN: x]");
  r = audit({ root: d }); assert.deepEqual(r.findings, []); assert.equal(r.notes.length, 1);
  writeFileSync(join(d, "docs/DEVPOST.md"), "Fine text. Run: [LIVE-RUN: x]");
  const reg = JSON.parse(readFileSync(join(d, "docs/claims-register.json"), "utf8")); reg.publicPaths.push("docs/DEVPOST.md"); writeFileSync(join(d, "docs/claims-register.json"), JSON.stringify(reg));
  assert.ok(audit({ root: d }).findings.some((f) => f.rule === "F"));
});
test("SR-F-62 claims audit: UI build output, dependencies and lock files are skipped, UI source is scanned", () => {
  const d = sandbox("Hello.", (reg) => { reg.publicPaths.push("ui"); });
  for (const p of ["ui/src", "ui/dist", "ui/node_modules/x"]) mkdirSync(join(d, p), { recursive: true });
  writeFileSync(join(d, "ui/dist/a.js"), "This guarantees it.");
  writeFileSync(join(d, "ui/node_modules/x/b.js"), "This guarantees it.");
  writeFileSync(join(d, "ui/package-lock.json"), JSON.stringify({ d: "This guarantees it." }));
  assert.deepEqual(rules(d), []);
  writeFileSync(join(d, "ui/src/c.tsx"), "export const t = 'This guarantees it.';");
  assert.ok(rules(d).some((m) => m.startsWith("C:") && m.includes("guarantees")));
});
