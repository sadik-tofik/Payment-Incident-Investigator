# 04 · Preliminary Design Review (PDR)

| Field | Value |
|---|---|
| Version | **1.0 LOCKED** (Wed 4 Nov 2026, owner message "approve PDR", 09:47 local, with decisions on PR-1, PR-4, DR-5, Tier 1 baseline). Changes now need an owner-approved CR. |
| Written against | BRS v1.0, SRS v1.2, Threat Model v1.0 (all LOCKED); S0-A and S0-B evidence in `evidence/` (hash-verified); build 0.5.0 |
| Purpose | Decide the architecture and the open design questions **before** the API contract and the UI prompt, so the UI agent does not build against an interface we then change. This document does not specify the API; it produces the decisions the API contract is derived from. |
| Scope guard | Tier 1 only (read-only diagnosis). Tier 2 (store write) and Tier 3 (capture) stay gated by S0-D, the Threat Model controls and the 8 Nov hard cut-off. Nothing here expands scope. |

---

## 1. What we are building (the narrow, defensible product)

> **Give the investigator a PayPal order ID. It reads that order from PayPal and the associated order from WooCommerce, and tells you what each system says, whether it can link them, where they disagree (or that it cannot tell), and which actions are safe and which are forbidden. It changes nothing.**

Evidence behind each part: reading both systems works on three real sandbox orders (13 and 17 completed, 20 approved-but-uncaptured; hashes verified). Linking works two ways on completed orders and one way, weakly, on the stuck order (S0-B). Discovery of stuck orders is **not** solved and is not claimed.

## 2. Decision register (what this PDR decides)

| ID | Decision | Status |
|---|---|---|
| DR-1 | Entry point is a **merchant-supplied PayPal order ID**. A WooCommerce order ID is accepted only as a secondary entry, and only works if the store holds the PayPal order ID. | Proposed |
| DR-2 | **Discovery is out of the prototype.** Webhook discovery is a documented roadmap item, optionally demonstrated with a signed sample event (Could). | Proposed |
| DR-3 | **Hybrid demo substrate:** the real sandbox WooCommerce store for the stuck-order path (recorded real captures replayed offline, live mode optional), and the ReferenceStore for injected cases. Every incident carries a label: `recorded`, `live` or `injected`. | Proposed |
| DR-4 | **No database.** Append-only JSONL (audit chain, request journal) and evidence files on disk. | Proposed |
| DR-5 | **Stay on plain Node.js (ESM) with JSDoc, not TypeScript**, and the built-in `node:http` module with a small router. Reason: 52 tests already pass on this code and the deadline is 12 Nov. (SQ-2 accepted "Node.js/TypeScript"; this keeps Node and defers TypeScript.) | Proposed |
| DR-6 | **Tier 1 has no action or approval endpoints at all.** They are not stubbed, not disabled, not built. | Proposed |
| DR-7 | The plugin version required by CR-001 comes from **operator configuration** in this build, shown in every result. Reading it from WooCommerce is a Could and is unverified. | Proposed |
| DR-8 | The AI explainer stays optional behind the existing interface. Model and spending cap are the owner's decision before any model call exists. Template explanation is the default. | Open (owner) |
| DR-9 | Judges run the project **offline from recorded real captures** with one command; live sandbox mode needs their own credentials and is optional. | Proposed |

## 3. Architecture

### 3.1 Components and boundaries

```
 Browser (UI by the owner's frontend agent)
        │  HTTP, JSON, /api/v1 only  (contract written after this PDR)
 ┌──────▼────────────────────────────────────────────────────────────┐
 │ API layer           node:http router, input validation, no logic    │
 ├─────────────────────────────────────────────────────────────────────┤
 │ Orchestrator        one investigation = a fixed sequence (3.2)      │
 │   ├─ PayPalReader      READ-ONLY, sandbox host allowlist (exists)   │
 │   ├─ StoreAdapter      interface (SR-F-04)                          │
 │   │     ├─ WooCommerceReader  GET only, read-scoped key  (to build) │
 │   │     ├─ ReplayStore        recorded real responses     (to build)│
 │   │     └─ ReferenceStore     injected cases              (exists)  │
 │   ├─ identity.js       confirmed / provisional / unresolved (exists)│
 │   ├─ engine.js         deterministic decision table     (exists)    │
 │   ├─ explain.js        template + validator + optional model (exists)│
 │   └─ audit.js          hash chain                       (exists)    │
 └─────────────────────────────────────────────────────────────────────┘
   Outside the process: PayPal sandbox API · a WooCommerce site · (optional) one AI model API
```

Boundary rules (from the Threat Model, restated as design constraints):
1. The engine and identity modules import no network code and no clock.
2. The explainer imports only `engine.js` (already tested).
3. The API layer never builds a verdict; it returns what the orchestrator returns.
4. The only components that touch a network are PayPalReader, WooCommerceReader and the optional model call. None of them has a write method in Tier 1 (tested for PayPalReader; to be tested for WooCommerceReader).
5. Store content crosses the adapter through an allow-list only (`localFactsFromWooOrder`).

### 3.2 One investigation (the sequence)

1. **Validate input.** PayPal order ID must match `^[A-Z0-9]{10,30}$` (my assumption from the three IDs seen; unverified as a PayPal rule, so the pattern is configuration). Anything else is rejected before any network call.
2. **Read PayPal** (`getOrder`). Unreadable gives verdict `unknown` and stops.
3. **Find the store order.** Use `purchase_units[0].custom_id` as the WooCommerce order ID. If missing, identity is unresolved (`paypal_custom_id_missing`) and we stop at the finding.
4. **Read the store order** (`StoreAdapter.getOrderByLocalId`). Unreadable gives `unknown`.
5. **Resolve identity** (`resolveIdentity`): confirmed, provisional or unresolved.
6. **Diagnose** (`diagnose`): verdict, evidence, safe and forbidden actions, fingerprint, identity basis.
7. **Explain**: template immediately; model text later if configured, validated or discarded.
8. **Append to the audit chain**; return the investigation record.

Budget (BO-5 target: median ≤ 60 s): steps 2 and 4 have a 20 s per-request timeout and 3 attempts in the current client, which can exceed 60 s in the worst case. Design parameter: an overall deadline of **30 s per investigation**; on expiry return `unknown` with reason `deadline_exceeded`. (My parameter; to be confirmed in the TDD.)

### 3.3 Modes (one engine, three data sources)

| Mode | Data source | Who can use it | Label shown |
|---|---|---|---|
| `replay` | Recorded real sandbox responses (orders 13, 17, 20) through the real adapter mapping and the real engine | Anyone, offline, no credentials. The default for judges and the public demo. | `recorded real sandbox capture` |
| `live` | Real PayPal sandbox + the owner's local WooCommerce | The owner, or a judge with their own sandbox credentials and store | `live sandbox` |
| `injected` | ReferenceStore cases | Anyone | `injected (not a real merchant incident)` |

Public deployment (Threat Model T-05): `replay` and `injected` only, no credentials loaded, no write routes registered (none exist in Tier 1).

## 4. How a PayPal order ID reaches the engine (DR-1)

Primary path: the merchant (or the demo operator) pastes a PayPal order ID into the UI; the API starts an investigation (3.2).
Where does a merchant get the ID? PayPal dashboard transaction details, the PayPal order's "update" / "capture" links in a support request, or the WooCommerce order page **when the store holds it** (it does for completed orders, it does not for the S0-B stuck order). This is a real friction and is stated to the user in the UI, not hidden.
Secondary path (local order ID): works only if `_ppcp_paypal_order_id` exists on the order; otherwise the UI answers "this store order carries no PayPal order ID; paste the PayPal order ID" (that absence is itself the S0-B finding).

## 5. Discovery options (DR-2)

| Option | How | Strengths | Weaknesses | Evidence status | Decision |
|---|---|---|---|---|---|
| A. Manual order ID entry | Merchant pastes the ID | Works today; no new infrastructure; honest | Merchant must already suspect the order | Proven by order 20 run (we read it by ID) | **Chosen for the prototype** |
| B. Webhook `CHECKOUT.ORDER.APPROVED` | PayPal pushes an event when an order is approved; we compare later and flag orders with no capture after N minutes | Real discovery; makes the PayPal Webhooks API visible (BRS BO-1 mentions Webhooks) | Needs a publicly reachable URL (unverified whether the sandbox can reach a tunnel here); signature verification needed; stateful (store pending approvals); more surface for the Threat Model | **Unverified**: not run | Roadmap. Optional Could: process a **signed sample event** in `replay`, labelled as a sample |
| C. Poll WooCommerce for old `pending` orders | List `status=pending` orders, then look each up on PayPal | No webhook infrastructure | We cannot map a stuck order to its PayPal order ID (the store lacks it, S0-B); would need `custom_id` search that PayPal's order API does not provide as far as I know | **Unverified** (my reading of the PayPal docs; not tested) | Rejected for now |
| D. PayPal Transaction Search | Query PayPal for transactions | Official reporting API | Lists completed transactions, so it cannot show an approved-but-uncaptured order (my understanding, unverified); 31-day window; must be enabled | **Unverified** | Not for P0-A |
| E. Change the merchant's site so the ID is stored earlier | Plugin or hook | Would restore the two-way link | Modifies the merchant's site (excluded by X11); out of scope | n/a | Rejected |

Consequence for the claims register: the product "diagnoses a PayPal order you give it". It does not "find stuck payments" (C-07, C-09 stay forbidden).
Note for BRS BO-1 ("Orders, Payments/captures, Webhooks visible in the first 30 s"): with option A the demo shows Orders and captures. Webhooks appears only if the Could in option B is built. **Owner decision:** keep BO-1 as written (and build the sample-event Could) or amend BO-1 through change control to drop Webhooks. I recommend amending, unless time clearly remains after Sprint 2.

## 6. Real store versus reference store (DR-3)

| Evidence we hold | |
|---|---|
| Real WooCommerce 11.2.1 + PayPal Payments 4.2.0, local Docker, sandbox, block checkout | Orders 13 and 17 (completed), order 20 (approved, uncaptured). Shareable files hash-verified. |
| Limits | Three orders; one flow (virtual product, USD, PayPal button); one interruption method (container paused). Raw files not shared. No P0-B (captured, locally unpaid) was ever observed in the real store. |

Decision: **hybrid**.
- The headline story (stuck order with a missing store-side ID) is shown from the **real captured order 20**, replayed through the real code path, labelled `recorded real sandbox capture`. This is the strongest honest asset and needs no judge credentials.
- P0-B and the safety stops (`multiple_captures`, `amount_mismatch`, `unknown`) come from the **ReferenceStore**, labelled `injected`. We could also create a P0-B in the real store by editing an order's status by hand; that would still be an injection and is labelled as one. It is not required.
- The Demo Honesty Ledger (BRS §14) lists: recorded replay, injected cases, template explanation (unless a model is configured), the single interruption method, and the provisional-identity limit.

Why not "real store only": a judge cannot run WooCommerce plus PayPal sandbox plus a stuck-order interruption in minutes (BR-10). Why not "reference store only": it would repeat the ChronoShield pattern of demonstrating something the real integration might not support.

## 7. Tier 1 scope and explicit exclusions

**In Tier 1:** investigate by PayPal order ID; show both systems' states with timestamps and `timeKind`; identity basis (confirmed, provisional, unresolved); verdict with evidence IDs; safe actions (human review only) and forbidden actions with reasons; template explanation (+ optional validated model text); audit chain and its verification; mode labels; replay and injected cases.

**Excluded (unchanged from the BRS, restated so the UI agent does not add them):** any button that executes anything (approve, capture, mark paid, refund, retry); multi-order dashboards or search; webhook receiver (except the Could); merchant accounts or login; fee or payout reporting; subscription, refund or dispute flows; other store platforms; production PayPal; notifications; editing anything in WooCommerce or PayPal.

## 8. How the UI must communicate identity and abstention (inputs to the API contract and UI prompt)

These are acceptance criteria on whatever the UI agent builds. Each can be checked by looking at a screen.

| # | Rule |
|---|---|
| UI-1 | Every investigation shows a **source badge**: `recorded real sandbox capture`, `live sandbox`, or `injected (not a real merchant incident)`. Always visible, never hidden behind a menu. |
| UI-2 | **Identity basis is shown next to the verdict**: `confirmed (both systems name each other)`, `provisional association`, or `unresolved`. For provisional, the required sentence (SR-F-08b) appears verbatim in the visible area: "PayPal order appears associated with WooCommerce order N based on PayPal-side identifiers and matching amount and currency. WooCommerce does not contain the PayPal order ID, so identity is not confirmed." |
| UI-3 | **`unknown` is shown as a finding, not as an error.** No red failure styling, no "something went wrong". The finding text and the specific reason (for example `store_has_no_paypal_order_id`) are shown. |
| UI-4 | `unknown` and unresolved identity are **never** shown with a green or "healthy" treatment. `ok` is the only verdict that may look reassuring, and only with confirmed identity. |
| UI-5 | Both systems' states appear **side by side**, each with its `retrievedAt` and, where it exists, event time. Observation times are labelled "observed at", never "happened at" (`timeKind`). |
| UI-6 | **Forbidden actions are listed with their reasons**; safe actions are listed as "suggested next step (human)". No control that looks like it executes anything. |
| UI-7 | Every statement in the explanation shows its evidence IDs, and each ID opens the evidence item (source, field, value, time, raw hash). |
| UI-8 | The explanation shows whether it is `template` or `AI (validated)`, and if the AI text was rejected, that it was replaced. |
| UI-9 | Color is never the only signal (icons and text accompany it). |
| UI-10 | The UI copy follows the forbidden-word list in BRS §9.3 (no "guarantees", "prevents", "root cause", "zero", "always", "never", "fully", "instantly", "production-ready", "autonomous"). A script checks the built UI strings (SR-F-62). |
| UI-11 | The first screen states the product's narrow promise in one sentence (section 1), and that it changes nothing. |
| UI-12 | When a PayPal order ID is missing from the store order, the UI says exactly how to get the PayPal order ID (section 4) instead of showing a dead end. |

## 9. Remaining engineering work (what the architecture implies we still build)

| Module | Status | Gate |
|---|---|---|
| WooCommerceReader (GET only; HTTPS Basic, or OAuth 1.0a over local http as in `capture.mjs`) | to build | none (S0-A cleared the read path) |
| ReplayStore (serves the recorded real responses through the same adapter mapping) | to build | none |
| Orchestrator + deadline | to build | none |
| HTTP API + OpenAPI file | to build | **PDR approval, then API contract** |
| Audit integration, verification endpoint | to build | none |
| Model wrapper (real call) | to build | owner's model and spending cap |
| Demo script (`npm run demo`), Demo Honesty Ledger, claims audit | to build | none |
| Tier 2 / Tier 3 | not started | S0-D, Threat Model controls, hard cut-off 8 Nov |

Calendar status (BRS §15.2): Sprint 1 (Wed 4 to Thu 5) goals "engine, PayPal client, adapter, injection" are partly done: engine, identity, PayPal reader and ReferenceStore exist; WooCommerceReader, ReplayStore and the orchestrator remain. Sprint 2 as written in the BRS (AI explanation, approved recovery, audit trail) should be read as: AI explanation, audit trail, and recovery only if the Threat Model controls (§7 of that document) are built and tested by Sun 8 Nov. I recommend **planning for Tier 1 as the submission** and treating Tier 2 as a bonus, because Tier 2 also needs S0-D and a safe write path that has not been examined.

## 10. Risks and open decisions

| ID | Item | Owner action |
|---|---|---|
| PR-1 | **AI contribution looks thin against the hackathon's "PayPal and AI" framing and the Technological Implementation / Innovation criteria.** By design the model only rephrases engine output. Options: (a) explainer only; (b) add a grounded Q&A over the investigation's evidence set (no tools, validated like the explainer; answers cite evidence IDs or abstain); (c) none. Recommendation: (a) now, (b) only if Sprint 2 finishes early. The safety design does not allow giving the model more authority. | Decide, and choose the model and spending cap (DR-8) |
| PR-2 | Plugin version is operator-declared (DR-7); a wrong declaration would let the adapter accept a layout it has not been tested on. | Accept, or ask for the `system_status` read to be tried |
| PR-3 | Everything real rests on three orders and one interruption method. | Optionally run one more interruption type if time allows; never claim generality |
| PR-4 | Webhook discovery and BO-1 wording (section 5). | Keep BO-1 or amend it |
| PR-5 | Demand is unvalidated (BRS RK-1); no merchant has seen this. | Interviews after the event; do not claim demand |
| PR-6 | Public demo hosting and cost; `replay` mode needs no credentials. | Pick a host (a sponsor prize offers Render credits) or run locally for the video |
| PR-7 | Repository publication: license and visibility must be confirmed by the owner; the folder is not yet a Git repository on my side; run `scripts/prepush-check.sh` before every push. | Confirm and push from your machine |
| PR-8 | Test count: I get 52 passing tests on build 0.5.0 under Node 22.23.4 (50 test blocks plus a 2-iteration loop); a reviewer reported 53. I cannot reproduce 53. | Send the exact command and output of the 53-test run |

## 11. Acceptance criteria for this PDR

The PDR is acceptable when the owner agrees that: (1) the product promise in section 1 is the scope; (2) DR-1 to DR-9 are accepted or amended; (3) the UI rules UI-1 to UI-12 are the checklist for the UI prompt; (4) PR-1, PR-4 and PR-8 have answers; (5) Tier 2 and Tier 3 stay gated.

## 12. What happens after approval
1. Lock PDR v1.0.
2. Derive the **API contract** (OpenAPI, versioned `/api/v1`) from sections 3, 4 and 8, and the Evidence Spec in parallel only where it does not depend on the contract.
3. Write the UI-agent prompt from the contract and UI-1 to UI-12.
4. TDD follows as a short document (module signatures, data shapes, error codes), because the code it describes largely exists.

## 13. Approval

Reply **"approve PDR"** to lock v1.0, or list changes. Locking does not unlock S0-D, Tier 2 or Tier 3.

## 14. Lock record (v1.0)
Owner decisions recorded: PR-1 explainer only (grounded Q&A only if Sprint 2 finishes early); PR-4 amend BO-1 via CR-003 (drafted, `CR-003-BO1.md`, awaiting owner approval of the wording); DR-5 plain Node ESM + JSDoc + `node:http`; Tier 1 is the submission target, Tier 2 only if Threat Model controls and S0-D are done before Sun 8 Nov; PR-8 test count stays 52 (owner reports reproducing 52). DR-8 (model and spending cap) remains the owner's open item. PR-7: owner states Apache-2.0 + Public; push is still not done and not performed by me.
Evidence note: the owner's message reports a capture-timing result for order `5LV75741Y0902515G` (50 min 20 s, from the pasted JSON's create times). I have not received the file or its hash, so it stays **R**, not V, until the file arrives and its SHA-256 is checked.

## 15. DR-8 record (4 Nov, 14:16 local)
Owner's own words: Gemini 2.0 Flash, $5 spending cap, kept off by default. Recorded as the owner's stated choice. **Availability is doubtful**: a Google AI developer forum post (19 Feb 2026, community-posted, not official) says Gemini 2.0 Flash would be discontinued on 31 March or 1 June 2026, and the earlier 1.5 Flash alias was scheduled for deprecation on 24 Sep 2025. It is now November 2026. Before any model wrapper is built, the owner (or I, with Google's official model list) must confirm a currently available model and price; the wrapper stays unbuilt and off until then. Template explanation is the default and the product does not depend on a model.


## 16. Addendum 7 Nov (CR-006)
Tier 1 is the final submission scope (Tier 2/3 stay gated, not built). DR-8: the owner's requested model `gemini-2.0-flash` has a Google shutdown date of 1 June 2026 (https://ai.google.dev/gemini-api/docs/deprecations, page updated 22 Oct 2026), so it is unusable; DR-8 remains unapproved until the owner names a currently available model and confirms the $5 cap. The wrapper stays unbuilt and disabled by default.
