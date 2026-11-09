# 02 · Software Requirements Specification (SRS)

| Field | Value |
|---|---|
| Project (working title) | Payment Incident Investigator |
| Version | **1.4 LOCKED** (7 Nov 2026) = v1.3 plus CR-005 items 1, 4, 5 (SR-F-15, SR-I-01, SR-F-02; owner message "approve CR-005", 08:08 local). v1.3 LOCKED (4 Nov 2026) = v1.2 plus CR-004 revision 2 (state fingerprint fields, §6.3; owner message "approve CR-004", 14:16 local). v1.2 (4 Nov 2026) = v1.1 plus change request CR-002 revision 2 (`docs/S0A-RESULT.md` section 8), approved by the owner on 4 Nov (message text "approve CR-002"). v1.1 (3 Nov) added CR-001; v1.0 (2 Nov) the original. Locking does not unlock gated items still open (S0-D, any write path, webhook discovery) and is not evidence that WooCommerce integration or money-moving actions are safe. |
| Derived from | 01-BRS v1.0 LOCKED (BR-01 to BR-16, §7.3 tiers, §9 Claims Register, §15.1a exception) |
| Written together with | 03-Threat-Model v1.0 LOCKED. Security requirements marked `[TM]` come from it. |
| Gating | Requirements tagged **GATED-BY-SPIKE** are locked only as questions. Their text is a *proposal* that spike S0-A (or S0-B) must confirm or change. |

**Changes in v1.3** (4 Nov, CR-004 revision 2): §6.3 `decisionState` now contains every input that can change identity, the verdict or an approval-relevant decision (see §6.3 and `docs/CR-004-FINGERPRINT.md`).

**Changes in v1.2** (4 Nov, CR-002 revision 2): new SR-F-08b (provisional association for approved-but-uncaptured orders, Tier 1 only, required wording, restricted verdicts). Evidence: S0-B attempt 2, WooCommerce order 20 / PayPal order 4EL84369TC886673M (hashes verified 4 Nov).

**Changes in v1.1** (3 Nov, CR-001, S0-A/S0-B evidence): SR-F-06 (version-gated meta key), SR-F-07 (paid statuses for the tested flow), new SR-F-08a (two-way identity, seven unresolved reasons, finding text), decision-table row 2, SR-I-22. Event time (SR-F-11) unchanged and still disabled: the order notes contain no status-change entries.

**Changes in v0.2** (review of 2 Nov; each point checked against v0.1 before adopting):
1. SR-F-11 reworded: a divergence *time* is reported only from event or history evidence; otherwise "disagreement observed at <observation time>"; otherwise abstain. A field such as `dateModified` is not treated as the time payment state diverged.
2. SR-F-30 now defines the state fingerprint (§6.3). v0.1 hashed facts that include `retrievedAt`, which would have invalidated approvals on an unchanged order. Accepted as a real defect.
3. Capture retry rule tightened (SR-F-37, SAF-5): an uncertain capture outcome is never retried automatically; re-read, then human review. Capture idempotency stays UNVERIFIED until tested.
4. AI requirement tightened (SR-F-22a): citation validation does not prove truth; the engine supplies every factual claim, the AI may only rephrase; template first, AI optional.
5. Tier 2 write path gated separately (SR-F-33a, new spike S0-D): S0-A read evidence is not evidence that writes are safe.
Also: SR-I-10 now covers redirects; SQ-1 to SQ-4 answered (§15).

---

## 1. Purpose and how to read this document

The BRS says what the business needs. This document says what the software shall do, in testable sentences. Each requirement has an ID (`SR-…`), the BR it comes from, a priority inherited from that BR (or lower), a verification method, and a gate status.

Wording rules (so nothing here becomes an overclaim later):
- **shall** = mandatory, testable. **should** = desirable if time allows. No other modal verbs are used.
- A requirement says what the system does on a stated input. It never says what PayPal or WooCommerce *does*; that belongs in the Evidence Spec.
- Numbers in `[param]` brackets are design parameters I chose. They are not measured facts and will be revisited in the TDD.
- Verification methods: **T** automated test, **I** inspection of an artifact, **D** demonstration, **E** evidence run against the sandbox (raw files committed).

## 2. Scope recap (from BRS, not renegotiated here)

| Tier (BRS §7.3) | Contents | SRS status |
|---|---|---|
| 1 Read-only diagnosis | Read both systems, classify P0-A and P0-B plus safety stops, show timeline, safe and forbidden actions, AI explanation, audit trail | **Must.** Fully specified below. |
| 2 Human-approved local repair | Update the local order status after approval, then verify | Specified, **GATED** (S0-A write path, Threat Model lock) |
| 3 Human-approved capture | Capture after approval and eligibility checks | Specified, **GATED** (Tier 2 passed, Threat Model lock). Could. |
| Side component | Request-recovery (BR-09) | Specified, independent of WooCommerce. Should. |

Out of scope: BRS exclusions X1 to X14. In particular nothing in this SRS permits automatic capture (X2, X3), full reconciliation (X13) or other incident types (X14).

## 3. System context

```
                     ┌──────────────────────────────────────────────┐
 Merchant operator ─►│  Merchant UI (built by owner's frontend agent)│
                     └───────────────┬──────────────────────────────┘
                                     │ versioned HTTP API only (BR-15)
                     ┌───────────────▼──────────────────────────────┐
                     │ Investigator service                          │
                     │  ┌────────────┐ ┌──────────────┐ ┌─────────┐ │
                     │  │ Evidence   │ │ Deterministic│ │ Action  │ │
                     │  │ collector  │►│ engine       │►│ gate    │ │
                     │  └─────┬──────┘ └──────┬───────┘ └────┬────┘ │
                     │        │               │ structured     │     │
                     │        │               ▼ evidence only  │     │
                     │        │        ┌──────────────┐        │     │
                     │        │        │ AI explainer │ (no tools)   │
                     │        │        └──────────────┘        │     │
                     │  ┌─────▼──────┐              ┌──────────▼───┐ │
                     │  │ Audit log  │◄─────────────│ Verifier     │ │
                     │  └────────────┘              └──────────────┘ │
                     └───┬──────────────────┬───────────────────┬────┘
                         │                  │                   │
                  PayPal Sandbox      Store adapter        AI model API
                  (Orders, Payments)  (WooCommerce | reference store)
```

The deterministic engine decides. The AI explainer only restates what the engine decided. The action gate is the only component that can call a PayPal write endpoint or a store write.

## 4. Domain model (the vocabulary every requirement uses)

### 4.1 Normalized facts
**PayPalFacts** (from the PayPal API): `paypalOrderId`, `orderStatus` (as returned), `orderCreateTime`, `orderUpdateTime` (if present), `captures[]` each with `id`, `status`, `amount`, `currency`, `createTime`, and `retrievedAt`. `captureCount` is the length of `captures[]` (all captures, not the first).

**LocalFacts** (from the store adapter): `localOrderId`, `rawStatus`, `normalizedStatus` ∈ {`unpaid`, `paid`, `cancelled`, `failed`, `on_hold`, `unknown`}, `total`, `currency`, `dateCreated`, `dateModified`, `datePaid` (nullable), `paypalOrderIdRef` (the link to PayPal), `retrievedAt`.

Normalization is a fixed lookup table. An unrecognised raw status maps to `unknown`, never to a guess.

### 4.2 Evidence item
Every fact the system shows or the AI cites is an evidence item: `evidenceId` (stable, e.g. `EV-0003`), `source` (`paypal` | `store` | `engine`), `field`, `value`, `eventTime` (nullable), `retrievedAt`, `rawRef` (pointer plus SHA-256 of the stored raw response). `eventTime` is only set when the source supplied a timestamp for the event. **An observation time is never presented as an event time.** (This is the C-02 lesson.)

### 4.3 Incident verdicts
`ok`, `approved_not_captured` (P0-A), `captured_local_unpaid` (P0-B), and the safety stops `multiple_captures`, `amount_mismatch`, `unknown`. Variants of P0-A and P0-B in which the local order is cancelled or the capture is pending/declined (see the decision table in SR-F-10) keep their own verdict names so that their forbidden actions differ.

### 4.4 Source tags
Requirements marked **[Sponsor]**, **[Research]** or **[Log]** carry the BRS source tags forward; everything else is **[Design]**, i.e. my decision, challengeable.

---

## 5. Functional requirements: evidence collection and matching

| ID | Requirement | BR | Pri | Verify | Gate |
|---|---|---|---|---|---|
| SR-F-01 | Given a PayPal order ID, the system shall read the order through the PayPal Orders API and produce PayPalFacts including **all** captures. | BR-01, BR-02 | Must | T (stub), E (sandbox) | none |
| SR-F-02 | The system shall store the **redacted** PayPal response (redaction under SR-N-12), with the SHA-256 of that redacted copy, as the basis of every PayPal evidence item. The raw response is not stored. | BR-01, BR-12 | Must | T, I | none |
| SR-F-03 | The system shall read the matching local order through the **StoreAdapter** interface (SR-F-04) and produce LocalFacts. | BR-01 | Must | T (reference store), E | none (interface); **GATED** (WooCommerce implementation, S0-A) |
| SR-F-04 | The system shall define a StoreAdapter interface with read operations `getOrderByLocalId`, `findOrdersByPayPalOrderId` and, in Tier 2 only, `updateOrderStatus`. The engine shall depend on the interface, never on a concrete store. Two implementations are planned: **ReferenceStore** (in repo, deterministic) and **WooCommerceAdapter**. | BR-02, BR-15 | Must | T, I | interface: none |
| SR-F-05 | The ReferenceStore shall support injecting each incident type on demand and shall mark injected orders `injected=true` in every response and evidence item. | BR-11 | Must | T | none |
| SR-F-06 | **(v1.1, CR-001 items 1 and 5.)** The WooCommerceAdapter shall read `paypalOrderIdRef` only from the order's `meta_data` entry with key `_ppcp_paypal_order_id`, and only for a plugin name and version on the recorded list (currently `woocommerce-paypal-payments` 4.2.0; evidence: two completed sandbox orders, S0-A and S0-B). Key and versions are configuration. Notes and `transaction_id` shall not be used for matching. For any other plugin version the identity result is unresolved (`plugin_version_not_recorded`). | BR-02, BR-01 | Must | T (contract tests on recorded real responses), E | **cleared for 4.2.0 happy path**; behavior on approved-but-uncaptured orders still **UNVERIFIED** |
| SR-F-07 | **(v1.1, CR-001 item 3.)** The WooCommerceAdapter shall read local status, totals, currency and date fields through the WooCommerce REST API with a read-scoped key and normalize status via the fixed table. `processing` and `completed` are treated as paid **for the recorded plugin version and the flow tested (block checkout, virtual product, USD)**. Statuses not in the table, including `refunded`, normalize to `unknown`. | BR-01 | Must | T, E | partly cleared (tested flow only) |
| SR-F-08 | Matching rule: an investigation shall start from a PayPal order ID or a local order ID. When more than one local order references the same PayPal order, or one local order references more than one PayPal order, the verdict shall be `unknown` with reason `ambiguous_match`, and no action shall be recommended other than "ask a human to review". | BR-02, BR-04 | Must | T | none |
| SR-F-08a | **(v1.1, CR-001 item 2.) Identity.** `resolveIdentity` shall return `confirmed` only when the PayPal order has exactly one purchase unit whose `custom_id` equals the WooCommerce order ID **and** the WooCommerce order's `_ppcp_paypal_order_id` equals the PayPal order ID. Otherwise it shall return `unresolved` with one reason of: `unreadable`, `plugin_version_not_recorded`, `store_has_no_paypal_order_id`, `store_has_multiple_paypal_order_ids`, `paypal_purchase_unit_count_not_one`, `paypal_custom_id_missing`, `ids_disagree`. An unresolved identity shall produce verdict `unknown` with reason `link_unresolved:<reason>` and the finding "Unable to link this WooCommerce order to a PayPal order using the available evidence." It shall never be reported as healthy or as an incident, and no action requiring approval shall be offered. The adapter shall not search WooCommerce by metadata. | BR-02, BR-04 | Must | T (all reasons; contract tests on real responses) | none |
| SR-F-08b | **(v1.2, CR-002.) Provisional association.** When the store holds no PayPal order ID, `resolveIdentity` shall return `provisional` (basis `provisional_association`) only if ALL hold: exactly one PayPal purchase unit; `custom_id` equals the WooCommerce order read; `invoice_id` ends with `-<that order id>` and starts with the configured site prefix when one is configured; PayPal amount and currency equal the store order's total and currency; recorded plugin version. Otherwise `unresolved` (SR-F-08a). Under `provisional` the engine may return only `approved_not_captured` or `approved_not_captured_locally_cancelled`; any other outcome becomes `unknown` with reason `link_unresolved:provisional_association_not_sufficient:<verdict>`; `ok` and `captured_local_unpaid` are never returned. Results carry `identityBasis`; every explanation shall include: "PayPal order appears associated with WooCommerce order N based on PayPal-side identifiers and matching amount and currency. WooCommerce does not contain the PayPal order ID, so identity is not confirmed." No action requiring approval, no capture and no write shall be offered on a provisional association, in any tier. `custom_id` and `invoice_id` are fields of the same PayPal order and are not independent proof of ownership. The entry point is a merchant-supplied PayPal order ID; webhook discovery is not part of this requirement. | BR-02, BR-04, BR-05 | Must | T (real order 20 fixture, all conditions, tier 3 enabled) | evidence limited to one order and one interruption method |
| SR-F-09 | If either system cannot be read (timeout, HTTP error, malformed body), the verdict shall be `unknown` with reason `unreadable:<system>`; the system shall **not** infer the state of the unreadable system, and the forbidden actions shall include capture, refund and mark-local-paid. | BR-02, BR-04 | Must | T | none |

## 6. Functional requirements: deterministic engine

| ID | Requirement | BR | Pri | Verify | Gate |
|---|---|---|---|---|---|
| SR-F-10 | The engine shall classify by the decision table in §6.1, evaluated top to bottom, first match wins. It shall contain no model call, no randomness and no clock reads other than reading timestamps from inputs. The same input shall always produce byte-identical output. | BR-02, BR-04 | Must | T (determinism test: 100 runs, identical hash) | table rows 7 to 10 are **GATED** for WooCommerce status semantics (S0-A) |
| SR-F-11 | **Divergence point.** For `approved_not_captured` and `captured_local_unpaid` the engine shall output a `divergencePoint` of one of three kinds. (a) `timeKind: "event"`: the time of a recorded event (for example PayPal's capture `create_time`, or a store order note/history entry with its own timestamp) that establishes when the disagreement began; allowed only when such event or history evidence exists. (b) `timeKind: "observed"`: "disagreement observed at <retrievedAt>" when only current snapshots exist; never presented as when the event happened. (c) `abstain` with a reason (`missing_timestamp`, `unreadable`, `ambiguous_match`, `insufficient_local_history`). Fields such as a store's `dateModified` shall not be used as an event time for payment divergence. | BR-03 | Must | T | partly **GATED** (which local timestamps exist, S0-A) |
| SR-F-12 | The engine shall never emit the words "root cause", "caused by" or an equivalent causal statement. It shall emit *what disagrees, since when (with timeKind), and which evidence supports it*. | BR-03, C-06 | Must | T (output scanner), I | none |
| SR-F-13 | The engine shall compare the single capture's amount and currency with the local order's total and currency. A mismatch yields `amount_mismatch`. The engine shall not sum captures, compute order totals, or handle partial captures or refunds (X13); more than one capture yields `multiple_captures`. | BR-02, X13 | Must | T | none |
| SR-F-14 | The engine shall output, for every verdict, `safeActions[]` and `forbiddenActions[]` (each with a reason string and the rule ID that produced it) from the safety rules in §6.2. | BR-04 | Must | T | none |
| SR-F-15 | The engine shall output `decisionStatus` limited to `rule_matched` or `abstain`. It shall not output a confidence value or probability. `rule_matched` means a decision-table row matched, not that the diagnosis is right. | BR-03 | Must | T | none |

### 6.1 Decision table (first match wins)

| # | Condition | Verdict | Notes |
|---|---|---|---|
| 1 | A system is unreadable (SR-F-09) | `unknown` | reason names the system |
| 2 | Ambiguous match (SR-F-08), or identity unresolved (SR-F-08a, reason `link_unresolved:<reason>`), or no match evidence supplied | `unknown` | |
| 3 | `captureCount` > 1 | `multiple_captures` | safety stop |
| 4 | Required state missing or unrecognised | `unknown` | |
| 5 | Order COMPLETED, capture COMPLETED, amount or currency differs from local total | `amount_mismatch` | safety stop |
| 6 | Order COMPLETED, capture COMPLETED, local `paid` | `ok` | |
| 7 | Order COMPLETED, capture COMPLETED, local `unpaid` or `on_hold` or `failed` | `captured_local_unpaid` (P0-B) | |
| 8 | Order COMPLETED, capture COMPLETED, local `cancelled` | `captured_local_cancelled` | P0-B variant; **no automatic repair**; human review (money was taken for an order the merchant treats as cancelled) |
| 9 | Capture PENDING | `capture_pending` | wait; no action |
| 10 | Capture DECLINED or FAILED | `capture_declined` | |
| 11 | Order APPROVED, no capture, local `cancelled` | `approved_not_captured_locally_cancelled` | P0-A variant; **capture forbidden** |
| 12 | Order APPROVED, no capture, local not cancelled | `approved_not_captured` (P0-A) | |
| 13 | Order CREATED or PAYER_ACTION_REQUIRED | `not_approved` | not an incident |
| 14 | anything else | `unknown` | |

Rows 1 to 6 and 9 to 14 use only PayPal states and the normalized local status. Rows 7, 8, 11 and 12 depend on what the local statuses *mean* in a real store, which is why they are gated for WooCommerce, not for the reference store.

### 6.3 State fingerprint (used by SR-F-30 and SR-F-32)

`stateFingerprint = SHA-256(canonical-JSON(decisionState))`, where `decisionState` contains **every input that can change identity, the verdict, or an approval-relevant decision**: PayPal order ID, order status, purchase-unit count, the complete ordered list of purchase units (each with `custom_id`, `invoice_id`, amount, currency and its captures' `id`, `status`, `amount`, `currency`), the scalar `custom_id`, `invoice_id`, unit amount and currency, and the flat capture list; store `localOrderId`, `normalizedStatus`, `total`, `currency`, `paypalOrderIdRef`, the count of PayPal order IDs held, plugin name and version; the identity state and reason; and the verdict. It excludes `retrievedAt`, raw response bytes, request IDs, capture/order timestamps and store dates (read only for optional `divergencePoint` text while event time is disabled), the store's raw status string, status history, `pluginVersionSource` (output only) and display-only fields. If an excluded field later becomes decision-relevant it shall be added in the same change. Test: re-reading an unchanged order yields the same fingerprint; changing any included field, including inside any purchase unit, changes it.

### 6.2 Safety rules (inputs to SR-F-14)

| Rule | Statement |
|---|---|
| SAF-1 | Capture is forbidden unless the verdict is `approved_not_captured` and the local order is not `cancelled`, and (Tier 3 only) the approval gate in SR-F-30 has passed. |
| SAF-2 | Refund is forbidden in every verdict (X4). |
| SAF-3 | `mark_local_paid` is safe only for `captured_local_unpaid`, and only in Tier 2. |
| SAF-4 | For `multiple_captures`, `amount_mismatch`, `unknown`, `captured_local_cancelled`: the only safe action is `ask_human_to_review`. Capture, refund, mark-local-paid and any automatic repair are forbidden. |
| SAF-5 | Automatic retry of a **capture** is forbidden in all cases (SR-F-37). Retry of other writes is forbidden unless it reuses the stored idempotency key of the original attempt (SR-F-31) after a re-read. |
| SAF-6 | Recommending an action does not authorise it. Authorisation exists only through SR-F-30. |

## 7. Functional requirements: AI explanation

| ID | Requirement | BR | Pri | Verify | Gate |
|---|---|---|---|---|---|
| SR-F-20 | The AI explainer shall receive **only** the engine's structured output (verdict, divergencePoint, evidence items, safe/forbidden actions). It shall not receive raw API bodies, buyer names, emails, addresses or free-text order notes. | BR-07, BR-14 `[TM]` | Must | T, I | none |
| SR-F-21 | The explainer shall return JSON matching a fixed schema: `summary`, `statements[]` each with `text` and `evidenceIds[]`, and `abstained` boolean. | BR-07 | Must | T | none |
| SR-F-22 | (see also SR-F-22a) A validator shall reject any explanation in which a statement has no `evidenceIds`, an ID that does not exist in the evidence set, or text containing a forbidden phrase list (the word list in BRS §9.3 plus "root cause"). A rejected explanation shall be replaced by the deterministic template text (SR-F-23); the UI shall be told the AI explanation was rejected. | BR-07, BR-12 | Must | T (negative tests with deliberately bad outputs) | none |
| SR-F-22a | **Citation validation does not prove a statement is true.** Every factual claim (status, amount, time, verdict, action) shall come from the engine's structured output; the AI may only rephrase or order them. The validator shall check that each number, status word, ID and timestamp in the AI text appears in the evidence set; any statement containing a value not in it causes fallback to the template. If grounding cannot be established, the template is used. The explanation accuracy rate on the eval set shall be reported and never described as zero-error. | BR-07, RK-7 | Must | T, E | none |
| SR-F-23 | A deterministic template explanation shall exist for every verdict, so that the product works with no AI available. | BR-07, RK-7 | Must | T | none |
| SR-F-24 | When the engine abstains or the verdict is `unknown`, the explainer shall abstain (`abstained=true`) rather than speculate. The validator shall reject a non-abstaining explanation for an `unknown` verdict. | BR-07, BR-03 | Must | T | none |
| SR-F-25 | The explainer process shall have **no** network route or credentials to PayPal or the store, and the explainer function shall have no tool-calling capability. `[TM]` | BR-07, BR-05 | Must | I, T | none |
| SR-F-26 | Every explanation shall record the model identifier, prompt version, latency and whether it passed validation (needed for the BO-7 and A4 numbers). | BO-7, A4 | Should | T | none |

## 8. Functional requirements: actions (Tiers 2 and 3)

All requirements in this section are **GATED**: Tier 2 by S0-A (can we write safely?) and the Threat Model lock; Tier 3 additionally by Tier 2 passing its tests. Nothing in §8 is built until the gate clears (BRS §15.1a).

| ID | Requirement | BR | Pri | Verify | Gate |
|---|---|---|---|---|---|
| SR-F-30 | **Approval gate.** An action shall execute only if it carries an approval record created by a human through the API, bound to (a) the incident's `stateFingerprint` (defined in §6.3), (b) the exact action and parameters, and (c) an expiry `[5 minutes]`. The gate shall be enforced in the service, not the UI. A missing, expired, reused or mismatched approval shall be refused with a recorded reason. | BR-05 `[TM]` | Must for any build of Tier 2/3 | T (bypass tests) | Threat Model lock |
| SR-F-31 | **Idempotency.** Before any PayPal write, the system shall generate and persist a request ID (SR-F-52 mechanism) and send it as `PayPal-Request-Id`. A retry shall reuse it. | BR-05 | Must | T, E | none for the mechanism |
| SR-F-32 | **Re-verification before execution.** Immediately before executing, the system shall re-read both systems and recompute the fingerprint. If it differs from the approved one, the action shall be refused and the incident re-diagnosed. | BR-05 `[TM]` | Must | T (state-change-between-approval-and-execute test) | none |
| SR-F-33a | **Write path is separately verified.** Before Tier 2 is built, a write spike (S0-D) shall establish and record from a real install: which WooCommerce status represents a successfully paid order; exactly which fields the repair changes; whether the update changes payment dates or other metadata or triggers emails, webhooks or stock changes; and that a write followed by a read confirms the intended state. Until S0-D has a result file, Tier 2 is a proposal, not a verified feature. | BR-06 | Should | E | **S0-D** (new), Threat Model |
| SR-F-33 | **Tier 2 action.** `updateOrderStatus` on the store shall set only `paid`-equivalent status, only for `captured_local_unpaid`, and shall add an order note recording the approver and evidence IDs. | BR-06 | Should | T, E | **S0-A**, Threat Model |
| SR-F-34 | **Tier 3 action.** Capture shall execute only for `approved_not_captured` with local not cancelled, after SR-F-30 to SR-F-32 pass. It shall use the stored request ID. | BR-05 | Could | T, E | Tier 2 passed, Threat Model |
| SR-F-35 | **Verification.** After every executed action the system shall re-read both systems and record `verified` (intended state reached), `failed` (not reached) or `indeterminate` (unreadable). A failure shall be shown as failed, never as success, and shall not be retried automatically. | BR-06, BO-4 | Should (with Tier 2) | T, E | with Tier 2 |
| SR-F-37 | **Uncertain capture outcome.** If a capture request times out, returns an unreadable body, or otherwise leaves the outcome uncertain, the system shall stop, re-read the PayPal order, and recompute the verdict. It shall never automatically send another capture. If the re-read cannot settle the state, it shall record `indeterminate` and require human review. Capture idempotency is UNVERIFIED until exact capture-retry behavior is tested in the sandbox; this requirement does not depend on it being true. | BR-05 `[TM]` | Must for Tier 3 | T, E | with Tier 3 |
| SR-F-36 | **Dry-run.** Every action endpoint shall support `dryRun=true` that evaluates the gate and returns what *would* happen without any write. | BR-05, BR-16 | Should | T | none |

## 9. Functional requirements: audit, request recovery, demo integrity

| ID | Requirement | BR | Pri | Verify | Gate |
|---|---|---|---|---|---|
| SR-F-40 | **Audit log.** Each record (investigation started, evidence collected, verdict, explanation, approval, action, verification) shall be appended with `prevHash` and `hash = SHA-256(prevHash ‖ canonical-JSON(record))`. No update or delete operation shall exist in the audit module's interface. | BR-08 | Should | T | none |
| SR-F-41 | A `verify-chain` operation shall recompute the chain and report the first broken record. A test shall modify a stored record and expect detection. | BR-08 | Should | T | none |
| SR-F-42 | The audit log shall state its limit in the UI/README: it detects modification; it does not prevent someone with disk access from rewriting the whole chain (unless the head hash is anchored elsewhere). `[Claims: C-07 FORBIDDEN as "tamper-proof"]` | BR-08, BR-12 | Should | I | none |
| SR-F-50 | **Request recovery (side component).** Before any create-order call, the component shall persist `(label, requestId, timestamp)` durably, then send. Recovery on a lost response shall retry with the **same** stored ID and accept either the original order or an equivalent. | BR-09 | Should | T, E | none |
| SR-F-51 | If a create call has a persisted ID with no recorded response, the component shall list it as `unresolved` and offer retry-with-same-ID only. If no ID was persisted for a call, it shall warn `no_request_id_persisted` and shall not claim recovery is possible. | BR-09 | Should | T | none |
| SR-F-52 | The same persistence mechanism shall serve SR-F-31. | BR-05, BR-09 | Should | I | none |
| SR-F-53 | BO-2b trials shall be run by a script that records, per trial, the request ID, both responses and whether the returned order ID equals the first. N is set in the Evidence Spec (≥ 10). | BO-2b | Should | E | none |
| SR-F-60 | **Demo disclosure.** Every incident shown in the UI shall display `injected` or `observed`. The README shall contain the Demo Honesty Ledger (BRS §14) listing every shortcut. | BR-11, BR-12 | Must | I, D | none |
| SR-F-61 | An injection script shall create each demo incident in the ReferenceStore, and (if S0-B succeeds) in WooCommerce, reproducibly from documented steps. | BR-11 | Must | T, E | WooCommerce part **S0-B** |
| SR-F-62 | A `claims-audit` script shall read the Claims Register, scan README/UI strings/video script for the forbidden-word list, and fail if a public string references a claim whose status is not PROVEN. | BR-12 | Must | T | none |

## 10. External interface requirements

### 10.1 HTTP API (consumed by the frontend agent; contract finalized in TDD) — BR-15

| ID | Requirement |
|---|---|
| SR-I-01 | The API shall be versioned under `/api/v1`, documented in the Markdown contract `docs/05a-API-CONTRACT.md` with the saved example responses in `docs/ui-fixtures/` (an OpenAPI file is optional), and the UI shall use no other endpoint. |
| SR-I-02 | Minimum operations: `POST /investigations` (start from an order ID), `GET /investigations/{id}` (verdict, evidence, divergencePoint, explanation, safe/forbidden actions, `injected` flag), `GET /investigations/{id}/timeline`, `POST /investigations/{id}/approvals`, `POST /investigations/{id}/actions` (with `dryRun`), `GET /audit`, `GET /audit/verify`, `GET /health`. Tier 2/3 endpoints exist in the spec only when built. |
| SR-I-03 | Error responses shall use one schema with a stable machine-readable `code` and a human sentence. No stack traces or secrets in responses. |
| SR-I-04 | Every response containing evidence shall include `retrievedAt` and `timeKind` per timeline entry so the UI cannot show an observation time as an event time. |

### 10.2 PayPal (sandbox only)
| ID | Requirement |
|---|---|
| SR-I-10 | The PayPal client shall refuse to send any request whose host is not on the sandbox allowlist, and shall fail at startup if the configured base URL is not on it, and shall **not follow redirects automatically**: a redirect response is an error unless its target host is also on the allowlist. `[TM]` |
| SR-I-11 | The client shall not hard-code success status codes (create returned 200 and repeat capture returned 201 in the evidence); it shall treat any 2xx as transport success and then validate the body. |
| SR-I-12 | The client shall time out each request `[20 s]` and retry reads `[3×]`; writes retry only under SR-F-31. Every attempt shall be logged, including network failures. |

### 10.3 Store (WooCommerce) — **GATED-BY-SPIKE S0-A**
| ID | Requirement |
|---|---|
| SR-I-20 | The adapter shall use a read-scoped REST key for Tier 1. A write-scoped key is introduced only for Tier 2 and is never present in the Tier 1 configuration. `[TM]` |
| SR-I-21 | The adapter shall request only the fields it needs (allow-list). Fields not on the list shall be dropped at the adapter boundary. |
| SR-I-22 | If a later run shows the PayPal order ID is not exposed for some order states (see S0-B open question), SR-F-06 and SR-F-08a are revised in a further minor version; until then the unresolved-identity finding is the specified behavior. |

### 10.4 AI model
| ID | Requirement |
|---|---|
| SR-I-30 | The model call shall be wrapped behind a single `explain(structuredEvidence)` function with a timeout `[15 s]`. Timeout, error or validator rejection shall yield the deterministic template (SR-F-23). |
| SR-I-31 | No credentials other than the model API key shall be available to this function. |

## 11. Non-functional requirements

| ID | Requirement | BR/BO | Verify |
|---|---|---|---|
| SR-N-01 | **Performance.** Median time from `POST /investigations` to a returned diagnosis (with deterministic explanation) shall be ≤ 60 s on the demo machine; the AI explanation may arrive after the diagnosis and shall not block it. Measured over ≥ 10 runs, raw timings committed. | BO-5 | E |
| SR-N-02 | **Determinism.** SR-F-10's determinism test shall pass on every CI run. | BR-04 | T |
| SR-N-03 | **Reproducibility.** From a clean clone, the documented commands shall run the full offline test suite and the seeded demo scenarios using only sandbox credentials supplied by the judge, or none for the ReferenceStore scenarios. | BR-10 | D (clean-machine run, recorded) |
| SR-N-04 | **Test honesty.** Tests that run against stubs or mocks shall be named and reported as such. The README shall never cite them as evidence of PayPal or WooCommerce behavior. | BR-12, C-01 | I |
| SR-N-05 | **Detector must be able to fail.** For each safety stop and each incident type, at least one test shall inject a faulty condition and assert the engine or gate catches it (the harness's buggy-mock approach). | BR-04 | T |
| SR-N-06 | **Usability for the video.** One scenario shall go from alert to verified result (Tier 2) or to a complete diagnosis (Tier 1) in ≤ 90 s of footage, rehearsed and timed. | BR-16 | D |
| SR-N-07 | **Availability.** None required. The system is a demo-scale single instance; no uptime claim is made. | n/a | I |
| SR-N-08 | **Portability.** Runs on Node.js LTS on Linux/macOS/Windows with no native dependencies beyond what npm installs. `[Design]` | BR-10 | D |
| SR-N-09 | **Observability.** Structured JSON logs with a correlation ID per investigation; no secrets or unredacted personal data. | BR-14 | T, I |
| SR-N-10 | **Licensing.** A permissive OSI-approved license file at repo root, visible in the repo's About section; dependencies' licenses compatible (OQ-5). | BR-13 | I |
| SR-N-11 | **Secrets.** No secret in the repo or its history; `.env.example` only; a secret scanner passes in CI and before submission. `[TM]` | BR-13 | T |
| SR-N-12 | **Redaction.** Emails, phone numbers, street addresses, payer names and any token-like strings shall be redacted before storage in logs, evidence files and AI input. Tests shall include seeded personal data and expect none to survive. `[TM]` | BR-14 | T |
| SR-N-13 | **Dependency hygiene.** Dependencies pinned by lockfile; fewest possible; `npm audit` result recorded. `[TM]` | BR-13 | I |
| SR-N-14 | **Accessibility and design** are specified in the UI prompt, not here (BRS BR-15). | BR-15 | n/a |

## 12. Data requirements

| ID | Requirement |
|---|---|
| SR-D-01 | Persistent stores: audit chain, evidence files, request-ID journal, approvals. A single embedded store (SQLite or append-only files) is acceptable; the choice is a PDR decision. |
| SR-D-02 | Money amounts shall be handled as strings or integer minor units, never floating point. Currency shall always accompany an amount. |
| SR-D-03 | All timestamps shall be stored in UTC ISO-8601 with the source's original string preserved alongside the parsed value. |
| SR-D-04 | Retention for the hackathon: sandbox data only; no deletion obligations, but the README states the data policy in two sentences. |

## 13. Traceability: BR to SR

| BR | Pri | SR requirements | Gated items |
|---|---|---|---|
| BR-01 | Must | SR-F-01, 02, 03, 04, 06, 07; SR-I-04 | SR-F-06, 07 |
| BR-02 | Must | SR-F-01, 03, 04, 05, 08, 09, 10, 13 | WooCommerce rows 7, 8, 11, 12 |
| BR-03 | Must | SR-F-11, 12, 15, 24 | SR-F-11 local timestamps |
| BR-04 | Must | SR-F-08, 09, 10, 14; SAF-1 to SAF-6; SR-N-02, 05 | none |
| BR-05 | Must | SR-F-30, 31, 32, 34, 37; SR-F-25; SR-I-10 | SR-F-30, 33, 34 |
| BR-06 | Should | SR-F-33, 33a, 35 | S0-A, S0-D |
| BR-07 | Must | SR-F-20 to 26; SR-I-30, 31 | none |
| BR-08 | Should | SR-F-40 to 42 | none |
| BR-09 | Should | SR-F-50 to 53 | none |
| BR-10 | Must | SR-N-03, 08 | none |
| BR-11 | Must | SR-F-05, 60, 61 | SR-F-61 (WooCommerce) |
| BR-12 | Must | SR-F-60, 62; SR-N-04 | none |
| BR-13 | Must | SR-N-10, 11, 13 | none |
| BR-14 | Should | SR-F-20; SR-N-09, 12 | none |
| BR-15 | Must | SR-I-01 to 04 | none |
| BR-16 | Must | SR-N-06, SR-F-36 | none |

Every BR has at least one SR. No SR exists without a BR (SR-N-07, SR-D-* are supporting; they are tied to BR-10/BR-14 and listed for completeness).

## 14. What may start now (applying BRS §15.1a once this SRS is locked)

| May start (independent) | Must wait (gated) |
|---|---|
| PayPal client (SR-F-01, 02, SR-I-10 to 12) | WooCommerceAdapter (SR-F-06, 07, SR-I-20 to 22): **S0-A** |
| Engine decision table for the ReferenceStore (SR-F-10 to 15), with rows 7, 8, 11, 12 labelled "reference-store semantics only" | Final classification semantics for WooCommerce statuses: **S0-A** |
| Audit chain (SR-F-40 to 42), redaction (SR-N-12), claims-audit script (SR-F-62) | Any write to a store or PayPal capture (SR-F-30 to 36): **Threat Model locked and relevant SRs locked** |
| ReferenceStore and injection (SR-F-04, 05, 61 partial) | Injection into real WooCommerce (SR-F-61): **S0-B** |
| AI explainer, validator and template (SR-F-20 to 26) | |
| Request recovery (SR-F-50 to 53) | |

## 15. Open items for the owner (answered 2 Nov)

| ID | Question | Why it matters |
|---|---|---|
| SQ-1 | Approval expiry `[5 minutes]` and request timeouts are my parameters. **Accepted provisionally; revisit in TDD.** | Tier 2/3 behavior |
| SQ-2 | Node.js/TypeScript: **accepted** (PDR confirms). | Reuse of tested code |
| SQ-3 | Keep SR-F-05 `injected` label mandatory in the UI, **Yes, mandatory.** | Honesty |
| SQ-4 | AI model and API: **open; owner decides before implementation, with a low hard spending cap; key never committed.** | SR-I-30, A4 measurements |

## 16. Approval

Reply **"approve SRS"** to lock v1.0, or list changes. Locking the SRS does **not** unlock gated items; those stay questions until the S0-A result file arrives.
