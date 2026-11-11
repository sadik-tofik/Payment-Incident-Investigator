# 06 · Evidence Specification

| Field | Value |
|---|---|
| Version | **1.0 LOCKED** (Sat 7 Nov 2026; owner message "approve Evidence Spec", 08:08 local, which also confirmed the two F-1/F-2 wording deviations). Content = v0.2. Applies the reviewer's conditional-approval items (F-1, F-2 wording; strict reproduction check; build provenance record). Changes now need a change request. Locking is not a deployment approval. v0.1 was 6 Nov. |
| Written against | BRS v1.1, SRS v1.3, Threat Model v1.0, PDR v1.0, API contract v1.0, build 0.7.x (engine, identity, orchestrator, server, evidence bundle) |
| Answers | The eight questions in the reviewer's brief (section numbers in brackets): provenance [2], identity [3], verdict support [4], contradictions [5], missing evidence and abstention [6], redaction and storage [7], reproducibility [8], limitations [11]. Rule for prose [9]. Public claims [10]. |
| Not in scope | Deployment approval, push, a security audit, production readiness. |

**Terminology (reviewer, 7 Nov).** "Read-only" in this project means *read-only with respect to PayPal and WooCommerce*: nothing is written to either, and no action executes. `POST /investigations` does create a local investigation record, an audit entry and, if configured, a bundle file. Public text must not say "read-only" without that qualification (CR-005).

**Governing rule.** Every claim the product displays must trace to a *source observation* or to a *clearly labelled inference*. Explanatory text must never be stronger than the evidence it cites. Where the code's text is stronger, section 9 lists it as a finding.

---

## 1. Evidence classes
Every field, evidence item and sentence belongs to exactly one class:

| Class | Meaning | Examples |
|---|---|---|
| **O** Observation | A value read from PayPal or WooCommerce at a stated time, unaltered | PayPal order status; capture id, status, amount; store raw status; store total |
| **D** Derived | A deterministic calculation from observations, no judgement | `normalizedStatus` (from the store's raw status), amounts compared in minor units, capture count, the identity checks |
| **I** Inference | A conclusion the rules draw from observations and derived values | the verdict; "confirmed / provisional / unresolved"; "disagreement observed at T" |
| **C** Declared | Configuration the operator supplies, not read from a system | plugin name and version, invoice prefix, mode |
| **A** Advice | An instruction to a person, not a statement of fact | "A person must decide", "Wait and check again" |

Evidence status labels used in project files: **V** verified (files seen, hashes checked), **R** reported (someone's statement, no file seen), **U** unknown.

## 2. Provenance: where each field comes from
Source columns: PP = PayPal Orders v2 GET; WC = WooCommerce REST order GET; CALC = our code. "Shown" = in the API response; "Hashed" = covered by `rawHash`; "In fingerprint" per SRS §6.3.

| Field (API) | Origin | Class | Shown | Hashed in | In fingerprint |
|---|---|---|---|---|---|
| `systems.paypal.status` | PP `status` | O | yes | PP redacted copy | yes |
| PayPal `purchaseUnitCount`, `custom_id`, `invoice_id`, unit amount/currency | PP `purchase_units` | O | yes (evidence) | PP redacted copy | yes |
| `captures[]` id, status, amount, currency | PP `payments.captures` | O | yes | PP redacted copy | yes |
| capture `createTime` | PP | O | yes (evidence eventTime, not used for verdict) | PP redacted copy | no (SRS §6.3 reason) |
| `systems.store.status` (raw) | WC `status` | O | yes | store LocalFacts | no (normalized is) |
| `normalizedStatus` | CALC from raw status via fixed table | D | yes | store LocalFacts | yes |
| store `total`, `currency` | WC | O | yes | store LocalFacts | yes |
| `holdsPayPalOrderId`, PayPal order ID held, count held | WC `meta_data` key `_ppcp_paypal_order_id` | O (value) / D (count) | yes | store LocalFacts | yes |
| `pluginVersion` | operator configuration (`operator_declared`) | **C** | yes | store LocalFacts | yes |
| `identity.state`, `reason` | CALC (`resolveIdentity`) | I | yes | not hashed (derived) | yes |
| `decision.verdict`, `ruleRow`, `reason` | CALC (`diagnose`) | I | yes | not hashed | yes |
| `divergencePoint` | CALC; time is the later of the two read times | I (about observation time) | yes | not hashed | no |
| `actions.safe/forbidden` | CALC from verdict and tier | D (fixed table) | yes | not hashed | no |
| `explanation` | template (fixed text per verdict) or validated model text | I + A | yes | not hashed | no |
| `retrievedAt` | our clock at read (replay: recording time) | O about *our read*, not about PayPal's state history | yes | no | no |

Provenance of the stored copies: PayPal facts come from the PayPal sandbox API response; the stored copy is the **redacted** response. Store facts come only through the allow-list `localFactsFromWooOrder`; the original WooCommerce response is **not** kept. `rawHash` therefore identifies *our stored copy*, never PayPal's or the store's original bytes, and does not prove authenticity.

## 3. Identity: exact evidence for each state
Code: `app/src/identity.js` (CR-001, CR-002). Two-way link is required for **confirmed**.

| State | Required evidence (all must hold) | Class |
|---|---|---|
| **confirmed** | store holds exactly one PayPal order ID and it equals the PayPal order's ID; the PayPal order has exactly one purchase unit; its `custom_id` is present and equals the store's order number; plugin name and version are in the recorded list (4.2.0) | O + D + C |
| **provisional association** (CR-002) | store holds **no** PayPal order ID; plugin version recorded; PayPal order has one purchase unit; `custom_id` equals the store order number; `invoice_id` ends with `-<store order number>` (and starts with the configured prefix if one is set); PayPal unit amount and currency equal the store total and currency in minor units | O + D + C. It is an **inference** from PayPal-side identifiers; the store never named the PayPal order. |
| **unresolved** | anything else, with one reason: `unreadable`, `plugin_version_not_recorded`, `store_has_multiple_paypal_order_ids`, `store_has_no_paypal_order_id`, `paypal_purchase_unit_count_not_one`, `paypal_custom_id_missing` (also: present but not 1 to 12 digits), `ids_disagree` | D |

What a provisional association may conclude (CR-002): only `approved_not_captured` or `approved_not_captured_locally_cancelled`; every other verdict becomes `unknown` with reason `link_unresolved:provisional_association_not_sufficient:<verdict>`; no approval-requiring action; capture and mark-paid forbidden. What it cannot show: that the store order and the PayPal order are the same purchase. `custom_id` and `invoice_id` are set by the plugin's checkout code; the product has no evidence of who else could write those fields.
The identity evidence is shown in the response as evidence items (PayPal order ID, purchase-unit count, `custom_id`, `invoice_id`, unit amount and currency, store order number, PayPal ID held, count held, plugin and version) so a reader can see *why* the state was reached (test: "evidence: identity evidence shows WHY each identity state was reached").

## 4. Verdict support (decision table, first match wins)
Evidence listed is what the engine adds to `evidence[]` and the rule reads. All verdicts additionally carry the identity evidence of section 3. Row numbers are SRS §6.1.

| Row | Verdict | Decisive evidence | Class of the conclusion |
|---|---|---|---|
| 1 | `unknown` (unreadable) | `readError` of the system | I (no conclusion) |
| 2 | `unknown` (link unresolved / ambiguous / missing match) | identity reason | I (no conclusion) |
| 3 | `multiple_captures` | `captureCount` > 1; each `captures[i]` | I from O |
| 4 | `unknown` | PayPal status or normalized store status missing or unrecognised | I (no conclusion) |
| 5 | `amount_mismatch` / `unknown` | one COMPLETED capture on a COMPLETED order; capture amount+currency vs store `total:currency` in minor units; unparseable amount gives `unknown` | I from O+D |
| 6 | `ok` | order COMPLETED, one capture COMPLETED, amounts equal, `normalizedStatus = paid` | I |
| 7 | `captured_local_unpaid` | same PayPal facts; `normalizedStatus` in {unpaid, on_hold, failed} | I |
| 8 | `captured_local_cancelled` | same PayPal facts; `normalizedStatus = cancelled` | I |
| 9 | `capture_pending` | `captures[0].status = PENDING` | I |
| 10 | `capture_declined` | `captures[0].status` DECLINED or FAILED | I |
| 11 | `approved_not_captured_locally_cancelled` | order APPROVED, `captureCount = 0`, store cancelled | I |
| 12 | `approved_not_captured` | order APPROVED, `captureCount = 0`, store not cancelled | I |
| 13 | `not_approved` | order CREATED or PAYER_ACTION_REQUIRED, `captureCount = 0` | I |
| 14 | `unknown` | none of the above matched | I (no conclusion) |

What the verdict does **not** assert: why the disagreement happened, whether it will resolve, or that PayPal's state at the time the buyer acted was the same as when we read it. `decisionStatus: rule_matched` means a table row matched, **not** confidence that the diagnosis is right in the real world.

## 5. Contradictions
| Disagreement | What the engine does | Verdict / state | Evidence shown |
|---|---|---|---|
| Amount differs (one completed capture) | compares in minor units | `amount_mismatch` | capture amount, store total |
| Currency differs | strict equality of currency codes | `amount_mismatch` | currency in both |
| Amount not parseable or currency unsupported | refuses to compare | `unknown` (row 5) | both raw values |
| PayPal order ID held by store differs from the PayPal order read | no link | identity `unresolved: ids_disagree` | both IDs |
| `custom_id` differs from store order number | no link | `ids_disagree` | both |
| More than one capture | does not total them | `multiple_captures` | each capture |
| Order COMPLETED but no capture, or capture COMPLETED but order not COMPLETED | no rule matches | `unknown` (row 14) | statuses |
| Store status unrecognised (for example refunded) | no guess | `unknown` (row 4) | raw status |
| PayPal and store timestamps disagree or are missing | **timestamps are not decision inputs**; event time is disabled; the divergence statement uses read times only | no effect on verdict | "observed at" |
| Store changes between our two reads | not detected (the two reads are not atomic) | verdict computed on whichever state each read saw | each `retrievedAt` is shown |
| Same order read twice, unchanged | same fingerprint | n/a | `stateFingerprint` |

## 6. Missing evidence and abstention
The engine abstains (`unknown`, `decisionStatus: abstain`, 200) when: a system could not be read *and the orchestrator still has something to report* (note: unreadable systems stop before the engine and return 502/504, API contract §4); identity is unresolved for any listed reason; match counts are missing or ambiguous; the PayPal or store status is missing or not recognised; an amount cannot be compared; no table row matches; or the identity is provisional and the verdict would be anything but the two approved-not-captured verdicts. The API never converts abstention into an error, nor an upstream failure into a verdict. Absence of evidence is never shown as "healthy".

## 7. Redaction, storage, hashing
| Data | Displayed | Stored | Hashed | Excluded |
|---|---|---|---|---|
| Statuses, amounts, currencies, order/capture IDs, `custom_id`, `invoice_id`, timestamps | yes | audit entry (IDs, verdict, fingerprint, hashes) and evidence bundle | yes | none |
| PayPal response | only the listed fields | **redacted copy** in the bundle (`redactedRaw`) | canonical JSON of the redacted copy | payer, payee, names, emails, phone, addresses, postal codes, billing, shipping (by key); email, bearer-token, long-token and phone patterns (by pattern) |
| WooCommerce order | allow-listed fields only | allow-listed LocalFacts in the bundle | canonical JSON of LocalFacts | everything else: names, emails, addresses, notes, line items, payment-method details, customer IDs |
| Credentials, tokens, client secrets | never | never | never | always (no module logs them; the AI input builder cannot receive them) |
| Raw PayPal and WooCommerce responses | no | **not in the repo or the bundle** (the owner keeps raw capture files outside the repository; they contain buyer details) | raw file hashes are recorded in evidence `SHA256SUMS` only | in git: `.gitignore` plus `scripts/prepush-check.sh` |

Redaction is key- and pattern-based and **best effort, not a guarantee**: a personal value under an unlisted key or an unusual format could pass. Pattern redaction also over-redacts (observed: digits of a `custom_id` became "[phone]" in a shareable file). Nothing in the product tells a user that stored text contains no personal data.

## 8. Reproducibility
- **What is stored per investigation** (when a bundle directory is configured; the local server `scripts/serve.mjs` configures one, tests do too): an *evidence bundle* (`evidence-bundle-1`): the redacted PayPal facts, allow-listed store facts, identity result, engine options, and the expected verdict, rule row, reason, status, fingerprint and evidence list. The audit entry carries the bundle's SHA-256 (`bundleSha256`).
- **Re-run:** `node scripts/reproduce.mjs <bundle.json>` re-runs the deterministic engine and exits 0 only if verdict, row, reason, status, fingerprint and evidence all match. **All six expected fields, `inputs` and `engineOptions` must be present; a bundle missing any of them fails** (v0.1 compared only the keys present, so an omitted field would have passed unchecked; fixed in 0.7.2 with a test). Tests: every replay and injected bundle reproduces; a doctored bundle is caught; `bundleSha256` in the audit log matches the file.
- **What this establishes:** that, given the stored inputs, the verdict follows from the rules and the stored inputs have not been altered since the audit entry was written *unless someone with write access rewrote both* (audit-chain limit, API contract §1).
- **What it does not establish:** that the stored inputs equal what PayPal or WooCommerce actually held. For `live` mode that would need the raw responses, which are deliberately not kept. For `replay`, the recorded raw files exist outside the repository and their hashes are in `evidence/` (V for the shareable files).
- **Not met:** investigations are held in memory (500 maximum, oldest evicted, lost on restart); the bundle and audit log survive on disk only if configured. A reviewer can reproduce from a bundle file but cannot fetch the original `Investigation` response after a restart. Bundle retention and size are unbounded (TDD item).

## 9. Prose must not outrun evidence
The explanation is a fixed template per verdict, plus the provisional notice and the divergence statement. A model, if ever enabled, may only rephrase; its output is checked against the evidence IDs and a forbidden-phrase list, and discarded on failure. That check is a **grounding guard, not a truth check** (SR-F-22a).

| Sentence (template) | Supported by | Class | Finding |
|---|---|---|---|
| "PayPal shows the capture as completed and the store shows the order as paid." | `captures[0].status`, `normalizedStatus = paid` | O+D | none |
| "PayPal shows the buyer approved the order, but no capture is recorded. The store order is not cancelled." | order APPROVED, `captureCount = 0`, `normalizedStatus != cancelled` | O+D | none |
| "... approved ... but the store order is cancelled. A person must decide." | same plus cancelled | O+D+A | none |
| "PayPal shows one completed capture, but the store order is not marked paid." | capture COMPLETED, `normalizedStatus` in unpaid set | O+D | "not marked paid" includes `on-hold` and `failed`, which differ for a merchant; the raw status is shown in evidence |
| "PayPal lists more than one capture on this order. A person must review." | `captureCount` | O+A | none |
| "The captured amount or currency differs from the store order total." | amounts, currencies | O+D | none; it does not say which is right |
| "The evidence is not sufficient to diagnose this order." | abstention reason | I | none |
| "PayPal shows the capture did not succeed." | status DECLINED or FAILED | O | none |
| "At the time of the read, PayPal listed this capture as pending. This result does not establish whether or when it will complete." | status PENDING | O | F-2 resolved |
| "At the time of the read, PayPal showed the order as <status>, and no capture was recorded. This result does not establish why the order was in that state." | status CREATED or PAYER_ACTION_REQUIRED (the observed one is named), no capture | O | F-1 resolved |
| "disagreement observed at T" | the later of the two read times | I about our read time | acceptable; it says nothing about when the disagreement began |
| provisional notice (verbatim, SR-F-08b) | section 3 provisional row | I | acceptable; it says "appears associated" and "not confirmed" |

Findings **F-1** and **F-2** are resolved in build 0.7.2. The reviewer rejected both of my proposed wordings ("not an incident", "so no capture is expected", "Wait and check again"). The replacement text keeps the reviewer's meaning but differs in two ways, which the owner should confirm: (a) it says "At the time of the read" instead of "currently", because replay mode shows a recording made on 3 Nov and "currently" would be false there; (b) for `not_approved` it names the status actually observed (for example CREATED) instead of the fixed phrase "CREATED or PAYER_ACTION_REQUIRED", because the grounding validator rejects a status that is not in the evidence. Result texts: not approved: "At the time of the read, PayPal showed the order as <observed status>, and no capture was recorded. This result does not establish why the order was in that state." Capture pending: "At the time of the read, PayPal listed this capture as pending. This result does not establish whether or when it will complete." A test checks both and that the old phrases are gone.

## 10. Public claims: what counts as proof
A claim may be published only in the wording and status below. "Proof" means the named file or test, re-runnable by a reviewer, **and** wording that matches what the evidence covers (the ChronoShield test: does the code do what the sentence says on the case it implies?). Statuses reflect today's evidence.

| ID | Candidate wording | Status | Proof held (or required) |
|---|---|---|---|
| C-01 | "Classifies an approved-but-never-captured PayPal order against a WooCommerce order." | **PARTIAL** | Held: recorded real order 20 (`evidence/s0b-uncaptured-2026-11-03/`, hashes V) through the real code, provisional identity only. Not held: a real P0-B (captured, store unpaid) was never observed; it is injected. Wording must say which. |
| C-02 | "In one sandbox run, a capture was created about 50 minutes after the order." | **V for that one order** | `evidence/sandbox-2026-10-30/` (shareable file hash-verified; raw seen by me, kept outside the repo). General delay is not claimed. |
| C-03 | "In a simulated lost-response sandbox test, same request ID returned the original order; a new ID created another." | PROVEN narrow (harness file, one run) | `scenario3-run.json` |
| C-04a/b | capture retry statements | PARTIAL / UNPROVEN | needs harness v0.3 run; **not used by the Tier 1 product** (no capture exists) |
| C-04 | "never captures twice" | **FORBIDDEN** | the product has no capture path in Tier 1; the claim is about nothing built |
| C-05 | "Recovers stuck orders." | **UNPROVEN / not built** | Tier 2/3 gated |
| C-06 | "AI finds the root cause." | **FORBIDDEN** | explanation is a template unless the operator switches the optional AI rephrasing on; AI text is validator-gated and cannot state a cause; two real model runs on record (orders 17 and 20, CR-009) |
| C-07, C-08, C-09 | speed, revenue loss, uniqueness | **FORBIDDEN** | no evidence collected |
| C-10 | "Reads orders from a real WooCommerce store with PayPal Payments 4.2.0." | **PROVEN narrow** | 3 real orders, WooCommerce 11.2.1, plugin 4.2.0, sandbox. Not "works with WooCommerce". |
| C-11 | "The audit log detects edits to entries (it does not detect a full rewrite)." | **PROVEN narrow** | tests: edit, removal, reorder detected; full rewrite passes (documented) |
| C-12 | "No route in the API executes anything." | **PROVEN narrow (API surface)** | tests: PUT/DELETE/PATCH refused, no action routes; reader classes have no write method. Data-flow review for the reviewer's open point remains |
| C-13 | "Flags a single capture whose amount or currency differs from the store total." | **PROVEN narrow** | injected case and unit tests; not "reconciles" |
| new | "Shows when it cannot link the two orders and says so." | **PROVEN narrow** | real order 20 store lacks the ID (V); unresolved and provisional tests |

## 11. Limitations (what the product does not know or prove)
1. It does not know that two orders are the same purchase when WooCommerce lacks the PayPal ID (provisional only).
2. It does not discover stuck orders; the merchant supplies the PayPal order ID.
3. It reads PayPal sandbox and one recorded plugin version (4.2.0) of one store setup (block checkout, virtual product, USD, one interruption method). Nothing else is known.
4. The plugin version is declared by the operator, not read from the store.
5. It does not know when a disagreement began, only when we observed it.
6. Its two reads are not simultaneous; state may change in between.
7. It does not total multiple captures, handle refunds, partial captures, currency conversion, or fees.
8. A verdict is a rule match, not a measured accuracy. No labelled-set accuracy has been measured on real merchant data. **The central product hypothesis is untested with any merchant.**
9. Redaction is best effort.
10. The audit chain shows internal consistency, not authenticity or tamper-proof storage.

## 12. Evidence file standard
`evidence/<name>-<date>/` containing only shareable, redacted files plus `SHA256SUMS`; raw captures stay outside the repository; every evidence statement in documents carries V, R or U, and V requires that I have seen the file and checked its hash. A file that fails `scripts/prepush-check.sh` is not committed. Evidence IDs: `EV-nnnn` within one investigation (per-investigation numbering, not global).

## 13. Known gaps carried to the IVM (not fixed by this spec)
| Gap | Status |
|---|---|
| Audit file: no multi-process locking, crash recovery or size bound | documented limitation; fix before any deployment |
| Rate limiter: optional; table now bounded; not a complete protection | documented |
| Investigations in memory; evicted or lost on restart | documented; bundles and audit survive if configured |
| Bundles and audit logs unbounded | TDD item |
| `rawHash` for store covers LocalFacts, not WooCommerce's response | by design, stated everywhere it is shown |
| Real P0-B never observed in a real store | open; would need S0-D-free local edit of an order status, labelled injected |
| F-1, F-2 template wording | resolved in 0.7.2 (section 9) |
| Unattributed code changes between 0.7.0 and 0.7.1 | recorded in `docs/PROVENANCE-0.7.x.md`; origin unknown, behaviour reviewed |
| Oversized request bodies | tested: 500 KB gives 400; over 1 MB closes the connection or returns 400; server stays healthy |

## 14. Acceptance criteria for this spec
The owner (and the adversarial reviewer) can confirm: (1) each of the eight questions is answered in a section above; (2) every displayed sentence is mapped to evidence and a class; (3) the F-1/F-2 replacement wording is accepted (section 9); (4) the claims table is the only list of publishable wording; (5) the limitations are acceptable to print in the README; (6) nothing here approves deployment, a push, or a production claim.

## 15. Approval
Reply "approve Evidence Spec" (confirm the two wording deviations in section 9), or list changes. Next: IVM (requirement to test to evidence-file matrix, the release gate).
