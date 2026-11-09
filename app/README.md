# Payment Incident Investigator: independent modules (build 0.3)

Status: first increment under BRS §15.1a. Everything here is **independent work** only (SRS §14). Sandbox only.

## What exists
| Module | SRS | Notes |
|---|---|---|
| `src/engine.js`, `normalize.js`, `fingerprint.js` | SR-F-10..15, 6.1..6.3 | Deterministic decision table; no model, clock, randomness or network |
| `src/scenarios.js` | SR-F-04, 05 | ReferenceStore + 18 labelled **injected** cases |
| `src/explain.js` | SR-F-20..24, 22a | Template + validator + model wrapper with fallback. No model is configured. |
| `src/audit.js` | SR-F-40..42 | Hash chain; detects edits; does not stop a full rewrite |
| `src/redact.js` | SR-N-12 | |
| `src/requestJournal.js` | SR-F-50..52 | Write-ahead request IDs |
| `src/paypalClient.js` | SR-F-01, SR-I-10..12 | **Read-only.** No capture or create method exists. |

## What does NOT exist (gated)
WooCommerce adapter (S0-A), anything that writes to a store (S0-D, Tier 2), anything that captures (Tier 3), HTTP API, UI, real AI model call (owner chooses model and spend cap first).

## Build 0.2 changes (review of build 0.1; each finding reproduced by reading the code, then fixed with a test)
1. `RequestJournal.run()` reuses the stored ID of an unresolved operation instead of minting a new one (restart test). `label` must identify one logical operation. No locking: single process only.
2. Event-time divergence is **off by default**; it needs `eventTimeVerified: true` AND history declared complete, and statuses are normalised before comparison. Until S0-A verifies a history source, output is "observed at".
3. PayPal allowlist cannot be widened by configuration. A mock-server subclass exists only in `test/helpers.js`.
4. `AuditLog` verifies the chain on open and refuses to append if broken or if the file changed since it was opened.
5. `toMinor()` supports only USD, EUR, GBP, CAD, AUD (2 decimals) and JPY (0). Any other currency is `unknown`.

## Build 0.3 changes (second review; each reproduced, then fixed with a test)
1. `AuditLog.append()` runs a full `verify()` every time and refuses on any break (an edit to an earlier record is now caught even when the last record is untouched). Concurrent writers are still not supported.
2. `RequestJournal.run()` allows one in-flight call per label; a second concurrent call is rejected (`operation_in_flight`), never given a new ID.
3. The engine no longer assumes a unique match. Missing or malformed `match` gives `unknown` / `missing_match_evidence`. The real adapter must supply explicit counts.
4. `confidence` is removed. `decisionStatus` is `rule_matched` or `abstain`: it says a table row matched, not that the diagnosis is reliable in the real world.
5. Event-time stays disabled for initial real integration (decision recorded; the flag exists only for tests).

## Honest limits
- Tests run against **stubs, a local mock HTTP server and a ReferenceStore**. They show how *our code* behaves. They are not evidence about PayPal or WooCommerce behavior (SR-N-04).
- The labelled set is 18 injected cases written by the author. 100% on it is a regression check, not a measured accuracy claim about real merchants.
- `normalize.js` treats `processing` and `completed` as paid. That is **reference-store semantics**, unverified against WooCommerce.
- The grounding check in `explain.js` is a guard against ungrounded values, not proof that a sentence is true.
- No claim of security, duplicate prevention or WooCommerce compatibility is made.

Run: `npm test` (Node 20+).
- Redaction is regex and key based. It is tested on seeded examples only; no claim of complete PII removal.
- Amount-mismatch cases cite all collected evidence; the divergence point is not produced for them.
