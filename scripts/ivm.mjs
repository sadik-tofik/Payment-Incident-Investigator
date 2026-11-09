// Generates docs/07-IVM.md from the locked BRS/SRS text and a curated map, and CHECKS it:
// every cited test title substring must match a real test; every cited artifact path must exist; every BR and SR ID in the locked
// documents must appear (uncurated IDs are listed as UNASSESSED rather than silently omitted). Run: node scripts/ivm.mjs [--write]
import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = new URL("../", import.meta.url);
const rd = (p) => readFileSync(new URL(p, ROOT), "utf8");

const ST = { OK: "IMPLEMENTED + TESTED", OFF: "IMPLEMENTED, DISABLED", NO: "NOT IMPLEMENTED", REF: "REFERENCE ONLY (not product-integrated)", PART: "PARTIAL", DEV: "DEVIATES FROM LOCKED TEXT", UN: "UNASSESSED (no test tagged to this ID)", NA: "NOT APPLICABLE" };
const M = { FP: "fixture parity", SA: "independent semantic assertion", OS: "observed scenario (one real sandbox setup)", NONE: "none" };

// ---- curated rows. t = test title substrings, a = artifact paths, ev = [evidence type, source, integrity], gt = ground-truth strength, gate = release gate / limit
const ROWS = {
  "BR-01": { s: ST.OK, m: [M.FP, M.OS], t: ["replay order 17", "replay order 20", "real data ("], a: ["evidence/s0a-2026-11-03/shareable", "evidence/s0b-2026-11-03/shareable", "evidence/s0b-uncaptured-2026-11-03/shareable", "docs/ui-fixtures/investigation-confirmed-ok.json"], ev: ["O (observed) + D", "owner-run local sandbox capture", "files hash-checked against owner's SHA256SUMS; origin not independently authenticated"], gt: "limited: 3 real orders, one setup", gate: "Replay evaluation only. Reads are not simultaneous; each system's state is shown as reported at its own retrieval time, not as a synchronised snapshot." },
  "BR-02": { s: ST.OK, m: [M.FP, M.OS], t: ["BO-2a style", "CR-002: provisional never yields ok", "real data (S0-B order 20"], a: ["app/data/replay/cases.json", "evidence/s0b-uncaptured-2026-11-03/shareable", "docs/ui-fixtures/investigation-injected-captured-local-unpaid.json"], ev: ["I (inference by rules)", "real order 20 (P0-A, provisional identity); P0-B is injected", "order 20 files hash-checked; injected fixtures are synthetic"], gt: "none for accuracy: fixture parity shows the engine returns the labels we wrote; no representative real set exists. P0-B never observed in a real store", gate: "Replay evaluation only. Not a measure of diagnostic accuracy." },
  "BR-03": { s: ST.OK, m: [M.SA], t: ["SR-F-11: P0-A gives observed time only", "SR-F-11 (review): event time is OFF by default", "SR-F-11: abstains when no timestamps"], a: ["app/src/engine.js"], ev: ["I", "engine over read times", "n/a"], gt: "none", gate: "Since BRS v1.2 (CR-005) the requirement is the observed disagreement and its observed time, which the build does. It does not say when the disagreement began. Fixture parity only." },
  "BR-04": { s: ST.OK, m: [M.SA, M.FP], t: ["SAF table:", "Tier 1 (default) offers no write action"], a: ["app/src/engine.js", "docs/ui-fixtures/investigation-provisional-approved-not-captured.json"], ev: ["D (fixed table)", "engine", "n/a"], gt: "none", gate: "Shows permitted human-only suggestions under deterministic policy rules; does not establish that a merchant's eventual decision is safe." },
  "BR-05": { s: ST.PART, m: [M.SA], t: ["Tier 1 (default) offers no write action", "read-only surface", "PayPalReader: reads a mock order", "WooCommerceReader: GET only"], a: ["app/src/server.js", "app/src/paypalClient.js", "app/src/wooClient.js"], ev: ["D", "code + tests", "n/a"], gt: "none", gate: "Tier 1 has no write path (tested). The approval gate, idempotency protection and re-verification **do not exist** (SR-F-30..37); the requirement is satisfied only vacuously. Data-flow review by an independent reader still open." },
  "BR-06": { s: ST.NO, m: [M.NONE], t: [], a: [], ev: ["none", "none", "none"], gt: "none", gate: "Out of Tier 1. Needs S0-D and a write path." },
  "BR-07": { s: ST.PART, m: [M.SA], t: ["SR-F-23: every labelled case", "SR-F-22: rejects", "SR-F-22a", "SR-F-24", "explain(): bad model output", "evidence spec F-1/F-2", "model client end to end"], a: ["app/src/explain.js", "app/src/modelClient.js"], ev: ["I + A (templates)", "fixed text per verdict", "n/a"], gt: "none", gate: "Deterministic **template** explanation is implemented and tested. An optional AI adapter (`modelClient.js`, CR-007) is implemented and **off by default**; it is tested only against **fake provider responses**, and **no run against a real model exists** (limited evidence). The requirement is not claimed as met until a real run is recorded. The validator is a token, ID and phrase guard, not a truth check; the AI may only rephrase." },
  "BR-08": { s: ST.OK, m: [M.SA], t: ["SR-F-40/41", "SR-F-42 limit is real", "audit refuses to append", "audit tampering is reported"], a: ["app/src/audit.js"], ev: ["D", "code + tests", "n/a"], gt: "none", gate: "**Deployment blocker**: no multi-process locking or crash recovery. A full consistent rewrite is not detected. Detects inconsistent edits, deletions and reorders only." },
  "BR-09": { s: ST.REF, m: [M.SA], t: ["ST-12 / SR-F-50", "SR-F-50: the intent is on disk", "SR-F-51", "review: run() never mints", "review: two concurrent run()"], a: ["app/src/requestJournal.js"], ev: ["D", "reference store", "n/a"], gt: "none for WooCommerce", gate: "Reference implementation only. Not wired into the investigator, and not applicable to the WooCommerce plugin (it issues its own request IDs)." },
  "BR-10": { s: ST.PART, m: [M.SA], t: ["investigation round trip", "health, cases"], a: ["scripts/serve.mjs", "app/data/replay/cases.json", "README.md"], ev: ["D", "local server tests", "n/a"], gt: "none", gate: "Offline replay and injected modes run and are tested. The README does not yet document running the server or the UI; no clean-machine run following the README has been done." },
  "BR-11": { s: ST.PART, m: [M.SA, M.FP], t: ["injected flag propagates", "replay case list for the UI", "saved UI example responses"], a: ["app/src/injected.js", "docs/ui-fixtures/investigation-injected-multiple-captures.json"], ev: ["C (declared mode)", "injected module", "synthetic"], gt: "n/a", gate: "Every response carries `source.label`; injected cases are labelled. The UI disclosure and the README Demo Honesty Ledger are not built." },
  "BR-12": { s: ST.PART, m: [M.SA], t: ["SR-F-62 claims audit"], a: ["scripts/claims-audit.mjs", "docs/claims-register.json", "docs/06-EVIDENCE-SPEC.md"], ev: ["D", "register + audit script", "n/a"], gt: "none", gate: "An automated phrase-and-reference guard runs over README, docs/public, UI copy paths and the UI fixtures, and from `prepush-check.sh`. It does **not** judge whether a sentence is true; BRS 9.3 rule 6 (a human ticks every sentence, including Devpost text and video narration, which are not yet written) remains. Without a Devpost/video file the guard cannot cover them." },
  "BR-13": { s: ST.PART, m: [M.NONE], t: [], a: ["scripts/prepush-check.sh", "README.md"], ev: ["R (reported)", "owner's report of repository state", "not verified by me"], gt: "none", gate: "A LICENSE file (Apache-2.0 text) is in the tree. This working copy is not a Git repository, so commit history cannot be checked from it. The pre-push script scans the current tree (and history only when run inside Git); its result on the real repository is reported by the owner, not seen." },
  "BR-14": { s: ST.OK, m: [M.SA], t: ["SR-N-12 / ST-10", "review S0-A: long field names"], a: ["app/src/redact.js"], ev: ["D", "code + tests", "n/a"], gt: "none", gate: "Best-effort key and pattern redaction; over-redacts (digits became \"[phone]\") and may miss unlisted fields." },
  "BR-15": { s: ST.PART, m: [M.FP], t: ["saved UI example responses", "every error carries the contract shape", "v0.5: caseId is exclusive"], a: ["docs/05a-API-CONTRACT.md", "docs/ui-fixtures/cases.json"], ev: ["D", "server responses", "n/a"], gt: "none", gate: "The contract is locked and 17 saved responses match the server for the tested scenarios. That the UI uses only the contract is untested; the UI is not in this tree." },
  "BR-16": { s: ST.NO, m: [M.NONE], t: [], a: [], ev: ["none", "none", "none"], gt: "none", gate: "No timed rehearsal exists and no timing was recorded. Replay execution speed is a separate technical property and is not claimed as usability." },
};
const SR = {
  "SR-F-01": { s: ST.OK, t: ["PayPalReader: reads a mock order", "toPayPalFacts keeps every capture"], a: ["app/src/paypalClient.js"] },
  "SR-F-02": { s: ST.OK, t: ["reproducibility:"], a: ["scripts/reproduce.mjs"], g: "Redacted copy and its hash are stored; raw response deliberately not (SRS v1.4)." },
  "SR-F-03": { s: ST.OK, t: ["WooCommerceReader: GET only", "allow-list: hostile"], a: ["app/src/wooClient.js"] },
  "SR-F-04": { s: ST.PART, t: ["allow-list: hostile"], a: ["app/src/wooClient.js", "app/src/replay.js"], g: "Read operation by local ID exists; `findOrdersByPayPalOrderId` and Tier-2 write do not." },
  "SR-F-05": { s: ST.OK, t: ["injected flag propagates", "BO-2a style"], a: ["app/src/injected.js"] },
  "SR-F-06": { s: ST.OK, t: ["identity confirmed both ways, verdict ok", "evidence: identity evidence shows WHY"], a: ["app/src/identity.js"], g: "Key present in real orders 13 and 17, **absent** in 20." },
  "SR-F-07": { s: ST.OK, t: ["unsupported plugin version is a finding"], a: ["app/src/identity.js"], g: "One plugin version (4.2.0) recorded; operator-declared." },
  "SR-F-08": { s: ST.PART, t: ["v0.4: both IDs given"], a: ["app/src/orchestrator.js"], g: "`findOrdersByPayPalOrderId` (multiple local orders for one PayPal order) is not implemented." },
  "SR-F-08a": { s: ST.OK, t: ["CR-001 item 2", "ids_disagree also"], a: ["app/src/identity.js"] },
  "SR-F-08b": { s: ST.OK, t: ["CR-002:", "real data (S0-B order 20"], a: ["app/src/identity.js", "evidence/s0b-uncaptured-2026-11-03/shareable"], g: "Inference from PayPal-side identifiers; two identical-amount orders could be mistaken." },
  "SR-F-14": { s: ST.OK, t: ["SAF table:"], a: ["app/src/engine.js"] },
  "SR-F-15": { s: ST.OK, t: ["review: decisionStatus is 'rule_matched'"], a: ["app/src/engine.js"], g: "`decisionStatus` only; no confidence field (SRS v1.4)." },
  "SR-F-21": { s: ST.PART, t: ["explain(): bad model output", "model client end to end: ungrounded"], a: ["app/src/explain.js", "app/src/modelClient.js"], g: "Schema is checked by the validator; no real model has produced it in this repository." },
  "SR-F-26": { s: ST.PART, t: ["model client end to end: valid grounded text"], a: ["app/src/modelClient.js"], g: "Audit entry records status, model id, prompt version, latency, rejection problems; verified with a fake provider only." },
  "SR-F-30": { s: ST.NO, t: [], a: [], g: "Approval gate not built (Tier 2/3)." }, "SR-F-31": { s: ST.NO, t: [], a: [], g: "Not built." }, "SR-F-32": { s: ST.NO, t: [], a: [], g: "Not built; the fingerprint exists but nothing consumes it." },
  "SR-F-33": { s: ST.NO, t: [], a: [], g: "Not built." }, "SR-F-33a": { s: ST.NO, t: [], a: [], g: "S0-D not run." }, "SR-F-34": { s: ST.NO, t: [], a: [], g: "Not built." },
  "SR-F-35": { s: ST.NO, t: [], a: [], g: "Not built." }, "SR-F-36": { s: ST.NO, t: [], a: [], g: "Not built." }, "SR-F-37": { s: ST.NO, t: [], a: [], g: "Not built." },
  "SR-F-50": { s: ST.REF, g: "Reference store only." }, "SR-F-51": { s: ST.REF, g: "Reference store only." }, "SR-F-52": { s: ST.NO, t: [], a: [], g: "Depends on SR-F-31, not built." },
  "SR-F-53": { s: ST.PART, t: [], a: ["evidence/sandbox-2026-10-30-run1"], g: "Run by the earlier harness (`harness/`), outside this app's tests; one run." },
  "SR-F-60": { s: ST.PART, t: ["replay case list for the UI"], a: ["docs/ui-fixtures/cases.json"], g: "API labels the source; UI and README ledger not built." },
  "SR-F-61": { s: ST.PART, t: ["injected flag propagates"], a: ["app/src/injected.js"], g: "ReferenceStore-style injection exists; WooCommerce injection not built." },
  "SR-F-62": { s: ST.OK, t: ["SR-F-62 claims audit"], a: ["scripts/claims-audit.mjs"], g: "Reads the register, scans public paths, fails on non-PROVEN citations and avoid-list wording. Phrase guard only; the SRS text says \"video script\", which is scanned only if `docs/VIDEO-SCRIPT.md` exists." },
  "SR-I-01": { s: ST.PART, t: ["saved UI example responses"], a: ["docs/05a-API-CONTRACT.md", "docs/ui-fixtures/cases.json"], g: "Markdown contract plus saved examples (SRS v1.4); no OpenAPI file; no test checks the UI uses only these endpoints." },
  "SR-I-02": { s: ST.OK, t: ["investigation round trip"], a: ["app/src/server.js"] },
  "SR-I-03": { s: ST.OK, t: ["every error carries the contract shape"], a: ["app/src/server.js"] },
  "SR-I-04": { s: ST.OK, t: ["saved UI example responses"], a: ["docs/ui-fixtures/investigation-confirmed-ok.json"] },
  "SR-I-11": { s: ST.UN, t: [], a: [] }, "SR-I-12": { s: ST.UN, t: [], a: [], g: "Client code retries reads; no test asserts the timeout or retry counts." },
  "SR-I-20": { s: ST.PART, t: ["WooCommerceReader: GET only"], a: ["app/src/wooClient.js"], g: "Code only issues GET; whether the configured key is read-scoped is operator-controlled and untested." },
  "SR-I-21": { s: ST.OK, t: ["allow-list: hostile"], a: ["app/src/identity.js"] },
  "SR-I-22": { s: ST.NA, t: [], a: [], g: "Resolved by CR-001/CR-002." },
  "SR-I-30": { s: ST.PART, t: ["explain(): bad model output", "model client end to end: a failing provider", "model client: a request that hangs"], a: ["app/src/explain.js", "app/src/modelClient.js"], g: "Timeout and fallback tested with fake providers only." },
  "SR-I-31": { s: ST.PART, t: ["model client: Gemini request", "model client: NVIDIA"], a: ["app/src/modelClient.js"], g: "Adapter sends only its own provider key, to a fixed host; tested with fake fetch." },
  "SR-N-01": { s: ST.PART, t: ["deadline: slow reader"], a: ["app/src/orchestrator.js"], g: "A 30 s deadline is enforced; the ≤ 60 s median was not measured against live systems." },
  "SR-N-03": { s: ST.PART, t: [], a: ["README.md"], g: "Tests were run from a fresh unzip of each build, not from a Git clone; replay documented only partly in the README." },
  "SR-N-04": { s: ST.PART, t: ["BO-2a style", "injected flag propagates"], a: ["app/test/helpers.js"], g: "Injected and mock tests are labelled; this is a convention, not enforced." },
  "SR-N-06": { s: ST.NO, t: [], a: [], g: "No timed rehearsal." },
  "SR-N-07": { s: ST.NA, t: [], a: [] },
  "SR-N-08": { s: ST.PART, t: [], a: ["app/package.json"], g: "Run on Node 22 on Linux only." },
  "SR-N-09": { s: ST.NO, t: [], a: [], g: "No structured logs or correlation IDs." },
  "SR-N-10": { s: ST.PART, t: [], a: ["README.md"], g: "LICENSE (Apache-2.0) present in the tree." },
  "SR-N-11": { s: ST.PART, t: [], a: ["scripts/prepush-check.sh", ".gitignore"], g: "Scanner exists; no CI; no `.env.example` seen." },
  "SR-N-13": { s: ST.PART, t: [], a: ["app/package.json"], g: "No dependencies, so no lockfile or audit result is needed; recorded as such." },
  "SR-N-14": { s: ST.NA, t: [], a: [], g: "UI prompt is `docs/05b-UI-AGENT-PROMPT.md`." },
  "SR-D-01": { s: ST.PART, t: ["SR-F-40/41"], a: ["app/src/audit.js"], g: "Append-only files; no approvals store (not needed in Tier 1)." },
  "SR-D-02": { s: ST.OK, t: ["SR-F-13: multiple captures are never summed; amounts use integer minor units"], a: ["app/src/normalize.js"] },
  "SR-D-03": { s: ST.UN, t: [], a: [] }, "SR-D-04": { s: ST.UN, t: [], a: [], g: "README states the data policy only in general terms." },
};

const GATES = [
  ["Tier 1 diagnosis on replay and injected cases", "IMPLEMENTED + TESTED", "Local evaluation only. Not a deployment approval."],
  ["Live PayPal / WooCommerce reads through the HTTP API", "IMPLEMENTED (reader classes), NOT WIRED to the server", "`mode: live` returns 403 `mode_not_enabled`. The reader classes exist and are tested with fakes; live use needs credentials and a decision."],
  ["Store write (Tier 2) and PayPal capture (Tier 3)", "NOT IMPLEMENTED", "Prohibited by the BRS hard rule and the Threat Model until S0-D and the Threat Model controls exist. Not a gate that something sits behind: nothing exists."],
  ["AI explainer adapter (Gemini / NVIDIA)", "IMPLEMENTED, DISABLED by default; fake-provider tests only", "Needs `AI_ENABLED=1`, a model id and the owner's key. No live run recorded. Per-process call budget, not a dollar cap. `gemini-2.0-flash` is shut down (CR-006)."],
  ["Public deployment", "DEPLOYMENT-BLOCKED", "Audit locking and crash recovery, retention bounds (investigations in memory, bundles unbounded), rate-limit and retention decisions, a security review."],
  ["Production use / production-ready claim", "FORBIDDEN", "Claims register C-08 equivalent; nothing here supports it."],
];

function titles() {
  const out = [];
  for (const f of readdirSync(new URL("app/test/", ROOT)).filter((f) => f.endsWith(".test.js"))) {
    const t = readFileSync(new URL(`app/test/${f}`, ROOT), "utf8");
    for (const m of t.matchAll(/^\s*test\((["`])((?:\\.|(?!\1).)*)\1/gm)) out.push({ file: f, title: m[2] });
  }
  return out;
}
const clean = (s, n = 150) => s.replace(/\*\*|`|\n/g, " ").replace(/\|/g, "/").replace(/\s+/g, " ").trim().slice(0, n);
function lockedRows(file, re) {
  const rows = new Map();
  for (const l of rd(file).split("\n")) { const m = l.match(re); if (m) { const c = l.trim().replace(/^\||\|$/g, "").split("|").map((x) => x.trim()); rows.set(c[0].replace(/\*/g, ""), c[1]); } }
  return rows;
}

export function build() {
  const errors = [], ts = titles();
  const br = lockedRows("docs/01-BRS.md", /^\| BR-\d+ \|/), sr = lockedRows("docs/02-SRS.md", /^\|\s*\*?\*?SR-[A-Z]-\d+[ab]?\*?\*?\s*\|/);
  const tagged = (id) => ts.filter((x) => new RegExp(`(^|[^A-Za-z0-9-])${id.replace(/[-]/g, "[-]")}([^0-9a-z]|$)`).test(x.title)).map((x) => x.title);
  const match = (subs, id) => {
    const found = [];
    for (const s of subs) { const hit = ts.filter((x) => x.title.includes(s)); if (!hit.length) errors.push(`${id}: cited test substring not found: "${s}"`); hit.forEach((h) => found.push(h.title)); }
    return [...new Set(found)];
  };
  const art = (list, id) => list.forEach((p) => { if (!existsSync(new URL(p, ROOT))) errors.push(`${id}: artifact not found: ${p}`); });
  const cell = (v) => String(v).replace(/\|/g, "/");
  const testCell = (arr) => arr.length ? arr.map((t) => clean(t, 90)).join("; ") + ` (${arr.length})` : "none";

  let out = `# 07 · Implementation Verification Matrix (IVM)

| Field | Value |
|---|---|
| Version | **1.0 LOCKED** (Sat 7 Nov 2026; owner message "approve IVM", 08:08 local). The owner approved v0.2 content before the external reviewer re-checked it; the reviewer's re-check is still pending. Changes need a change request. **Generated** by \`scripts/ivm.mjs\` from the locked BRS/SRS text and a curated map; \`app/test/ivm.test.js\` fails if a cited test or artifact does not exist or this file drifts from the generator.  |
| Written against | BRS v1.2, SRS v1.4, Threat Model v1.0, PDR v1.0, API contract v1.0, Evidence Spec v1.0 LOCKED, build 0.8.5 |
| Replaces | An earlier draft of this matrix supplied by the owner on 7 Nov. It stated that the Evidence Spec was locked (it is not), cited test names and test IDs that do not exist, used a claim numbering that conflicts with the BRS register, and marked BR-12, BR-16 and BR-13 as verified. Those rows are corrected here. Its reviewer's findings (provenance wording, BR-03, BR-16, status vocabulary, API "read-only" wording, evidence type vs provenance, fixture parity) are applied. |

**Reading rule.** A passing test, a saved fixture, a documented limitation and a safe release are four different things. Each row therefore separates: the requirement (excerpt of the locked text), the **implementation status**, the **verification method**, the tests (exact titles), the evidence artifacts, the **evidence type, source and artifact integrity** (kept apart), the **ground-truth strength**, and the **release gate or limit**.

## 1. Vocabulary
**Implementation status:** ${Object.values(ST).join(" · ")}.
**Verification method:** fixture parity (the engine returns the answer we wrote for a known case); independent semantic assertion (a test states a property that does not copy the engine); observed scenario (one real sandbox setup); none. *External ground truth* and *real merchant validation* are listed as methods and **no row has either**.
**Evidence type** (Evidence Spec §1): O observation, D derived, I inference, C declared, A advice.
**Artifact integrity:** "hash-checked" means a SHA-256 in a manifest matched the file. It shows the file was not altered since the manifest. It does **not** show the file came from PayPal or WooCommerce, when it was captured, or that it represents the system's real state. Source authenticity of every real capture rests on the owner's report; it is not independently authenticated. (The earlier draft's "V = verified real systems" is withdrawn.)

## 2. Business requirements (BRS)
| ID | Requirement (locked text, excerpt) | Status | Method | Tests (exact titles) | Artifacts | Evidence: type · source · integrity | Ground-truth strength | Release gate / limit |
|---|---|---|---|---|---|---|---|---|
`;
  const seen = new Set();
  for (const [id, text] of br) {
    seen.add(id); const r = ROWS[id];
    if (!r) { errors.push(`${id}: BR in BRS but not curated`); continue; }
    const tests = match(r.t, id); art(r.a, id);
    out += `| ${id} | ${cell(clean(text))} | ${r.s} | ${r.m.join(" + ")} | ${cell(testCell(tests))} | ${r.a.length ? r.a.map((x) => "`" + x + "`").join("<br>") : "none"} | ${r.ev.join(" · ")} | ${r.gt} | ${cell(r.gate)} |\n`;
  }
  for (const id of Object.keys(ROWS)) if (!seen.has(id)) errors.push(`${id}: curated but not in BRS`);

  out += `
## 3. Software requirements (SRS): every ID in the locked SRS
Tests are those cited in the curated map **plus** any test whose title carries the ID. A row with none shows "none". "UNASSESSED" means no test is tagged to the ID and I have not claimed coverage by other tests.

| ID | Requirement (locked text, excerpt) | Status | Tests (exact titles) | Artifacts | Note / limit |
|---|---|---|---|---|---|
`;
  const unassessed = [];
  for (const [id, text] of sr) {
    const r = SR[id] ?? {};
    const auto = tagged(id), manual = r.t ? match(r.t, id) : [];
    const tests = [...new Set([...manual, ...auto])];
    art(r.a ?? [], id);
    const status = r.s ?? (tests.length ? ST.OK : ST.UN);
    if (status === ST.UN) unassessed.push(id);
    out += `| ${id} | ${cell(clean(text, 130))} | ${status} | ${cell(testCell(tests))} | ${(r.a ?? []).map((x) => "`" + x + "`").join("<br>") || "none"} | ${cell(r.g ?? "")} |\n`;
  }
  for (const id of Object.keys(SR)) if (!sr.has(id)) errors.push(`${id}: curated but not in SRS`);

  out += `
Counts (generated): ${[...sr.keys()].length} SRS IDs, ${unassessed.length} unassessed (${unassessed.join(", ") || "none"}). Threat Model security tests ST-01..ST-15 are traced in the Threat Model; the IDs seen in test titles (ST-01, ST-10, ST-12) are listed against their SRS rows above, and the rest are **not** claimed here.

## 4. Release gates (implemented, disabled, absent and blocked are different)
| Capability | State | Meaning |
|---|---|---|
${GATES.map((g) => `| ${g[0]} | ${g[1]} | ${g[2]} |`).join("\n")}

## 5. Public claims
The only list of publishable wording is Evidence Spec §10 (BRS claim IDs). This matrix does not restate claims, to avoid a second, conflicting numbering.

## 6. Deviations and gaps this matrix exposes
| # | Finding | Where | Action |
|---|---|---|---|
| D-1 | Code and locked SRS disagree: \`confidence\` vs \`decisionStatus\` | SR-F-15 | RESOLVED: CR-005 item 1 (SRS v1.4) |
| D-2 | BR-03 as written ("earliest recorded event") is not what is built | BR-03 | RESOLVED: CR-005 item 2 (BRS v1.2) |
| D-3 | "read-only" is used for an API with a POST that creates local records | contract, README, UI prompt | RESOLVED in text: CR-005 item 3 (contract note, UI prompt, README) |
| D-4 | No OpenAPI file | SR-I-01 | RESOLVED: CR-005 item 4 (SRS v1.4) |
| D-5 | Raw PayPal response is not stored; redacted copy is | SR-F-02 | RESOLVED: CR-005 item 5 (SRS v1.4) |
| D-6 | Claims audit is a phrase/reference guard, not a truth check; Devpost text and video script not yet written so not covered | BR-12, SR-F-62 | human tick-through before submission (BRS 9.3 rule 6) |
| D-7 | No timed rehearsal | BR-16, SR-N-06 | do before submission (needs the UI) |
| D-8 | README does not document the server, replay run or the Demo Honesty Ledger | BR-10, SR-F-60 | write before submission |
| D-9 | Git history not checkable from this copy (a credentials note was found in the working folder on 9 Nov and removed, see CR-008) | BR-13 | owner runs the pre-push script inside the real Git repository |
| D-10 | AI adapter built but never run against a real model | BR-07 | owner runs one live call with his own key and keeps the output as evidence; until then claim no AI result |
| D-11 | Unattributed code changes between 0.7.0 and 0.7.1 | provenance | \`docs/PROVENANCE-0.7.x.md\` |
| D-12 | Limiter has two overlapping bounds | server.js | cleanup, no behaviour risk |
| D-13 | Central hypothesis untested with any merchant; accuracy unmeasured | all | stated in Evidence Spec §11; do not claim |

## 7. Sign-off checklist (what is true today)
- [x] Every cited test title and artifact path exists (checked by the generator on every test run).
- [x] Every BR and SR ID in the locked documents appears in this matrix.
- [x] Suite passes on a fresh unzip of the build named above (recorded in the delivery message, not in this file).
- [x] Evidence Spec locked v1.0 and CR-005 approved (owner, 7 Nov).
- [ ] Reviewer re-check of IVM v1.0 (pending).
- [x] Claims audit exists and runs from the pre-push script (phrase guard only; D-6).
- [ ] Timed rehearsal exists (D-7).
- [ ] 87 or more tests passing is a baseline for these behaviours; it is **not** evidence of real-world diagnostic accuracy, deployment safety or production readiness.
`;
  return { md: out, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { md, errors } = build();
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
  if (process.argv.includes("--write")) { writeFileSync(new URL("docs/07-IVM.md", ROOT), md); console.log("docs/07-IVM.md written"); } else console.log("IVM check ok");
}
