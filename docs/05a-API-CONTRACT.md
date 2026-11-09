# 05a · API Contract (Tier 1, read-only)

> **Terminology (CR-005 item 3, 7 Nov).** "Read-only" in this contract means read-only with respect to PayPal and WooCommerce: no payment or order write and no action executes. `POST /investigations` creates a local investigation record, an audit entry and optionally an evidence bundle. Routes and shapes are unchanged by this note.

| Field | Value |
|---|---|
| Version | **1.0 LOCKED** (4 Nov 2026, 14:16 local; owner's message "approve API contract"; content = v0.6 plus the Markdown table fix in the 502 row). Changes now need an owner-approved change request. Locking does not approve DR-8, enable live mode, authorise deployment or authorise a push. Previously v0.6 draft: v0.6: explicit `mode` validation, `custom_id` handling, per-purchase-unit fingerprint, `systems.store` is null when no store read happened. v0.5 applied the reviewer's three items: fingerprint inputs (needs CR-004 against SRS §6.3), `caseId` exclusivity, narrower audit claim. v0.4 was:  v0.2 error handling and `rawHash`; v0.3 aligned to the built orchestrator; v0.4 applies the reviewer's five blocking items and clarifications. |
| Derived from | PDR v1.0 §3, §4, §8; SRS v1.2; build 0.6.x (`app/src/orchestrator.js`) |
| Audience | The owner's frontend agent, and the backend tests |
| Rules | Base path `/api/v1`. JSON only. **Nothing in this API writes to PayPal or WooCommerce or executes anything.** No action, approval, capture or retry routes exist (PDR DR-6). Field names below are the contract; a change needs a version bump. |

## 1. Routes

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | `{ "ok": true, "build": "<package.json version at start-up>", "modesAvailable": [...] }`. `build` is read from `package.json` (never a literal). `live` appears in `modesAvailable` only if credentials are configured. |
| GET | `/api/v1/cases` | `[ { "id", "title", "mode" } ]` for `replay` and `injected`. **No PayPal or WooCommerce identifiers are listed.** The server resolves a `caseId` to its order (see 2). |
| POST | `/api/v1/investigations` | Run one investigation (read only). POST only because it creates a record and an audit entry. |
| GET | `/api/v1/investigations/{id}` | A stored investigation. |
| GET | `/api/v1/investigations/{id}/evidence/{evidenceId}` | One evidence item. |
| GET | `/api/v1/audit/verify` | `{ "ok", "entries", "firstBadIndex" }`. **Chain consistency only**: it detects an inconsistent chain (an edited, removed or reordered entry that was not re-hashed). It does **not** prove authenticity or tamper-proof storage: someone who can write the log file can rewrite every entry and recompute every hash and the check will still pass. Anchoring the head hash somewhere the writer cannot change would give a stronger guarantee; that is not built. It also says nothing about whether PayPal or store data was genuine, and the UI must not describe it that way. |

## 2. Request: POST /investigations
```json
{ "mode": "replay | live | injected",
  "caseId": "replay/injected only; resolved server-side to an order",
  "paypalOrderId": "optional",
  "localOrderId": "optional" }
```
**At least one of `caseId`, `paypalOrderId`, `localOrderId` is required** (else 400 `invalid_body`). Exact semantics:

| Supplied | What the server reads | Result |
|---|---|---|
| `paypalOrderId` only | PayPal order; then the store order named by the PayPal order's `custom_id` | Normal investigation. **`custom_id` handling:** it is used as a store order number only if the order has exactly the shape the store uses (1 to 12 digits). If it is missing, **or present but not 1 to 12 digits** (for example `inc1-…`), **no store request is made**: the result is a 200 unresolved finding with reason `paypal_custom_id_missing` (that reason means "missing or unusable as a store order number", so the SRS reason list is unchanged) and `systems.store = null`. |
| `localOrderId` only | The store order; if it holds exactly one PayPal order ID, that PayPal order is read | Normal investigation. If the store holds no PayPal order ID: 200 unresolved finding `store_has_no_paypal_order_id` with `needs.paypalOrderId = true`, `systems.paypal = null`. |
| both | PayPal order from `paypalOrderId`, store order from `localOrderId` | Identity is still checked both ways. A pair that does not name each other is a finding, never "confirmed". |
| `caseId` | Resolved to the case's input | **Exclusive.** `caseId` together with `paypalOrderId` or `localOrderId` is 400 `invalid_body`; `caseId` with `mode:"live"` is 400 `invalid_body`; a case that does not belong to the requested `mode` (or does not exist) is 400 `unknown_case`. No reconciliation is attempted. |

Validation (no network call is made before it passes): a **missing or unsupported `mode` is 400 `invalid_body`**; `paypalOrderId` must match `^[A-Z0-9]{10,30}$` (configurable; an assumption from the IDs seen, not a PayPal rule) else 400 `invalid_order_id`; `localOrderId` must be 1 to 12 digits else 400 `invalid_body`; `mode:"live"` without credentials is 403 `mode_not_enabled` (the public deployment never enables it). A well-formed `localOrderId` that the store says does not exist is 404 `store_order_not_found` (4.1).

## 3. Response: Investigation (HTTP 200)
```json
{
  "id": "inv_…", "createdAt": "ISO-8601",
  "source": { "mode": "replay", "label": "recorded real sandbox capture" },
  "input": { "paypalOrderId": "…|null", "localOrderId": "…|null" },
  "identity": { "state": "confirmed | provisional_association | unresolved", "basis": "…", "reason": "null | store_has_no_paypal_order_id | ids_disagree | plugin_version_not_recorded | …", "requiredNotice": "null | the verbatim provisional sentence (SR-F-08b)" },
  "needs": { "paypalOrderId": true },
  "systems": {
    "paypal": null,
    "store": { "localOrderId": "…", "status": "…", "normalizedStatus": "…", "holdsPayPalOrderId": false, "retrievedAt": "…", "eventTime": null, "timeKind": "observed", "amount": "…", "currency": "…", "pluginVersion": "…", "pluginVersionSource": "operator_declared" }
  },
  "decision": { "decisionStatus": "rule_matched | abstain", "verdict": "…", "ruleRow": 0, "reason": "…", "finding": "…|null", "divergencePoint": {}, "stateFingerprint": "…" },
  "evidence": [ { "id": "EV-0001", "source": "paypal|store|engine", "field": "…", "value": "…", "observedAt": "…|null", "eventTime": null, "rawHash": "…|null" } ],
  "actions": {
    "safe": [ { "id": "ask_human_to_review", "label": "…", "rule": "SAF-4", "humanActionOnly": true } ],
    "forbidden": [ { "id": "capture", "reason": "…", "rule": "SAF-1 | CR-002 | …" } ]
  },
  "explanation": { "kind": "template | ai_validated", "text": "…", "statements": [ { "text": "…", "evidenceIds": ["EV-0001"] } ], "citedEvidence": ["EV-0001"], "aiStatus": "not_configured | accepted | rejected | timeout | error", "aiRejected": false },
  "integrity": { "hashSpec": "…", "paypal": "…", "store": "…", "establishesAuthenticity": false, "note": "…" },
  "limits": [ "…" ],
  "auditId": "…|null"
}
```
`needs` is present only when the caller must supply a PayPal order ID. `systems.paypal` and `systems.store` are `null` when that system was not read (unresolved findings); a null means "not read", never "empty".

Rules the UI may rely on:
1. `timeKind` is always `"observed"` (event time is disabled in this build).
2. **`actions.safe` entries are suggestions for a person.** `humanActionOnly: true` means exactly that. There is no field anywhere in this API that means "approved", "authorised" or "executed", and the UI must not imply one. (`requiresApproval` was removed in v0.4 because it could be misread.)
3. A completed investigation is 200, including `verdict: "unknown"`, `decisionStatus: "abstain"` and any identity other than `confirmed`.
4. `explanation.aiStatus` is `"not_configured"` whenever AI explanations are switched off, which is the default (CR-007; the optional model adapter exists and is enabled only by the operator's environment). `aiRejected: true` means model text failed validation and the template replaced it.
5. `limits` is always present and shown.

### 3.1 `stateFingerprint`
SHA-256 of the canonical JSON of **every input that can change identity, the verdict, or an approval-relevant decision**. Included:
- PayPal: order ID, order status, purchase-unit count, and the **complete list of purchase units in order**, each with its own `custom_id`, `invoice_id`, amount, currency and captures (id, status, amount, currency), so a change inside any unit moves the fingerprint; plus the scalar `custom_id`, `invoice_id`, unit amount/currency and flat capture list the engine reads.
- Store: order ID, normalized status, total, currency, the PayPal order ID it holds (or null), how many PayPal order IDs it holds, plugin name and plugin version.
- The identity state and its reason, and the verdict.

Deliberately **excluded**, with the reason: retrieval times and raw bytes (they change on every read); capture and order timestamps and store dates (the engine uses a capture time only to build the optional `divergencePoint` text while event time is disabled; no verdict, identity or action rule reads them); the store's raw status string (only the normalized status is decision-relevant; the raw string appears as evidence only); `pluginVersionSource` (it is output-only: no identity or decision code reads it, checked by search of `engine.js`, `identity.js`, `fingerprint.js`); store status history (read only when event time is enabled, which it is not). **If any excluded field later becomes decision-relevant it must be added.** The invoice prefix is configuration; its effect enters through the identity state and reason.

Two investigations of an unchanged state have the same fingerprint. A changed fingerprint means a decision-relevant fact changed. It is not a signature and not authenticity. It is returned in Tier 1 responses; it has **no approval-enforcement effect** until the gated approval features exist. This widens SRS §6.3 and is proposed as **CR-004**; CR-004 is approved (4 Nov) and SRS §6.3 is updated (SRS v1.3).

### 3.2 Evidence and hashes
- **What `rawHash` hashes:** SHA-256 of canonical-json-v1 (keys sorted, no whitespace) of the **whole object the evidence came from**, not of the single field: for PayPal, the redacted copy of PayPal's response; for the store, the allow-listed LocalFacts object. The store hash is **not** a hash of the original WooCommerce response, and the UI must say "stored copy" wherever it shows a hash. `engine` evidence has `rawHash: null`.
- **Determinism:** `canonical-json-v1` is the rule in `app/src/canonical.js`; any change to it is a contract version bump so old hashes stay checkable.
- **Authenticity:** a hash identifies the stored copy. It does not prove PayPal or the store produced it. `integrity.establishesAuthenticity` is always `false`.
- **What evidence values may contain:** statuses, amounts, currencies, order and capture identifiers, timestamps, and engine-derived text. Never names, emails, addresses, notes, line items or payment-method details: those never cross the store boundary (allow-list) and PayPal responses are redacted. Sandbox identifiers do appear in evidence values for `replay` and `live` runs (they are not secrets; they are sandbox).

## 4. Errors
Shape: `{ "error": { "code", "message" }, "partial": …, "auditId": "…|null" }`.

| HTTP | code | When | `partial` | Audited |
|---|---|---|---|---|
| 400 | `invalid_order_id`, `invalid_body`, `unknown_case` | Rejected before any network call | none | no |
| 403 | `mode_not_enabled` | live without credentials | none | no |
| 404 | `investigation_not_found`, `evidence_not_found` | Unknown stored id | none | no |
| 404 | `paypal_order_not_found` | **Only** when PayPal itself answered 404 with its `RESOURCE_NOT_FOUND` error body | `{system:"paypal", reason, retrievedAt}` | **yes** |
| 404 | `store_order_not_found` | **Only** when WooCommerce answered 404 with its order-not-found error code (assumed code `woocommerce_rest_shop_order_invalid_id`; **not yet observed from a real store**, so this mapping is unverified) | `{system:"store", …}` | **yes** |
| 429 | `rate_limited` | public deployment | none | no |
| 502 | `upstream_unreachable`, `upstream_auth_rejected`, `upstream_bad_response` | A system could not be read, refused our key, or answered unusably. **A bare 404 without the not-found body is `upstream_bad_response`** (wrong address or an intermediary), not "not found". | `{system, reason, retrievedAt}` where `system` is `"paypal"` or `"store"` | **yes** |
| 504 | `deadline_exceeded` | 30 s overall deadline | `null` (it is not known which system was slow) | **yes** |
| 500 | `internal_error` | bug | none | best effort |

`auditId` is present for every audited failure when an audit log is configured, and `null` if the audit write itself was refused (that never masks the original error). `partial` is never an Investigation: it has no `decision`, and the UI must not show a verdict for it. A rejected upstream credential is 502 `upstream_auth_rejected`, not 401, because the caller did not fail to authenticate; nothing is retried with broader permissions.

### 4.1 Abstention versus retrieval failure
200 means both systems were read and the engine finished, even if it abstained. 502/504 mean we could not complete a read. Inside the engine, "unreadable gives unknown" (SRS) is unchanged; the orchestrator simply does not call the engine when a system cannot be read, and a test covers that.

## 5. What the UI agent must not add
Buttons or routes for approve, capture, mark-paid, refund, retry, edit; lists of "stuck orders"; wording from the BRS §9.3 forbidden list; any green treatment for `unknown` or non-confirmed identity; any wording that says audit verification proves the payment data was authentic; any reading of `humanActionOnly` as authorisation (PDR UI-1..UI-12 are the checklist).

## 6. Open items before deployment (not before the UI starts)
- Rate-limit value and investigation storage/retention (TDD). **Do not deploy publicly until these are decided.**
- The WooCommerce not-found error code (4, row `store_order_not_found`) to be confirmed against a real store response.
- (Done) Owner approved CR-004 revision 2 and this contract on 4 Nov.
