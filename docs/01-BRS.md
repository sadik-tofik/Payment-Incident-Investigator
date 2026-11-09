# 01 · Business Requirements Specification (BRS)

| Field | Value |
|---|---|
| Project (working title) | Payment Incident Investigator |
| Version | **1.2 LOCKED** (7 Nov, CR-005 item 2 changed BR-03 only; owner message "approve CR-005", 7 Nov 08:08 local). v1.1 LOCKED (4 Nov, CR-003 changed BO-1 only). Previously **1.0 LOCKED** on Mon 2 Nov 2026 (owner wrote: "I approve BRS v0.4 as the baseline. Lock it as v1.0"). History: v0.2 30 Oct (raw sandbox files); v0.3 2 Nov (scope cut to P0); v0.4 2 Nov (third review); v1.0 2 Nov (locked, content identical to v0.4 apart from the changes listed below). |
| Date | Fri 30 Oct 2026 |
| Owner | Sanzo (solo builder) |
| Drafted by | Claude |
| Lock status | **LOCKED v1.0.** Changes only through change control (§15.5). |
| Next documents | 02 SRS and 03 Threat Model, drafted together (started 2 Nov) |

**Changes in v0.2** (from reading the raw evidence in `evidence/sandbox-2026-10-30/`, checksums in `SHA256SUMS`):
1. E-03 downgraded in precision: the delayed capture and the "APPROVED" re-query appear only in a hand-written note, not in any machine log, and no capture timestamp was recorded.
2. E-04: the v0.1 harness **could not have detected a second capture** (it read only the first capture in the response). Scenario 2 therefore proves nothing about duplicate captures. C-04 stays UNPROVEN.
3. E-05 upgraded: raw file with PayPal debug IDs supports the same-key/new-key result for the simulated-loss case.
4. Real PayPal returned HTTP 200 for create-order (not 201) and HTTP 201 for a repeat capture. Both differ from my earlier assumptions; no code or claim may depend on a hardcoded status.
5. OQ-7 answered. A fixed harness (v0.2.0) is ready for spike S0-C.

**Changes in v0.3** (2 Nov; from two independent reviews of harness v0.2/v0.3, each finding reproduced before acting):
1. **Scope cut to the three P0 incident types** (BR-02). Risk RK-8's trigger fired (Sprint 0 passed Sun 1 Nov), so P1 and P2 incidents are not in v1.
2. **C-02 reworded.** The harness measures *first-observed-APPROVED to PayPal's capture `create_time`*, not the true approval time. Approval happened at or before first observation, so the measured interval is a **lower bound** on approval-to-capture. Claims must say "at least N minutes after PayPal was first observed reporting APPROVED".
3. **C-04 split.** C-04a is retry idempotency (what each retry returned). C-04b is the final capture count. A run can prove C-04b while retries show warnings; it must not be described as proving C-04a.
4. **New C-13 (FORBIDDEN) and exclusion X13.** The classifier checks one capture against one expected amount and currency. It is not financial reconciliation (no partial captures, order totals, aggregate amounts, refunds or currency conversion).
5. **C-01 and C-10 restated:** WooCommerce behavior and production behavior are unverified. The three P0 types are *defined*, not validated against WooCommerce.
6. The 28 passing offline tests show the behavior of our code and stubs. They are not evidence about PayPal's behavior and must never be cited as such.
7. **Schedule:** Sprint 0 is extended to **Tue 3 Nov** (see §15.2). The SRS and Threat Model are written together to recover the day.

**Changes in v0.4** (2 Nov; third review):
1. **E-03 and OQ-7 updated:** PayPal's capture `create_time` is reported as 2026-10-30T09:04:55Z, about 50 min 19 s after order creation. Raw file still requested.
2. **C-02 reworded more conservatively than my v0.3 wording.** For this run the lower-bound-from-approval argument fails: the 08:15 and 08:20 reads did not save their status, so we cannot show the order was APPROVED then. The claim is therefore relative to order creation only. The "at least N minutes after first observed APPROVED" form applies only to future v0.3 runs.
3. **The lost create response is no longer a classifier incident** (BR-02, BR-09). The classifier compares payment states; recovery from a lost create is a separate request-recovery component. BO-2 is split into BO-2a (classifier) and BO-2b (zero duplicates). Open question OQ-10: it may not belong in a merchant product at all.
4. **Delivery tiers added (§7.3).** Read-only diagnosis is the floor. Human-approved repair and capture are Should and Could. BR-06 and BO-4 are conditional on recovery being built.
5. **Sprint 0 gate rewritten:** S0-A is the critical gate and dependent documents stay GATED instead of being locked on assumptions.
6. **Process exception proposed (OQ-11):** non-gated build may start after the SRS is locked.

**Changes in v1.0** (2 Nov; lock; the only edits since v0.4):
1. Status changed to LOCKED.
2. **OQ-11 resolved as a bounded process exception** (§15.1a). Independent work may proceed; gated work may not.
3. §15.1 and §15.3 reworded so they no longer contradict each other.
4. OQ-10 resolved: lost-create stays as the optional Should-level component BR-09, no WooCommerce claim.
5. E-03 stays **R** until the raw GET JSON is committed. S0-A stays the decisive open risk. Neither is changed by the lock.

**Source tags used throughout** (from your Opportunity Canvas worksheet):
`[Sponsor]` the hackathon's own rules or documents · `[Research]` public sources I read (issue trackers, docs, repos) · `[Sandbox]` results from your run of the sandbox harness (reported, raw files not yet seen) · `[Log]` your own problem log · `[Interview]` a real conversation (none yet) · `[Assumption]` nothing supports it yet.

**Evidence status tags:** **V** I read the source myself this session · **R** reported to me, raw evidence not yet supplied · **U** came from a third-party summary, I have not read the source.

---

## 1. Purpose of this document

This document fixes four things before any design or code exists:

1. The problem, the customer, and what "working" means as a number.
2. The scope: what we build, and a longer list of what we refuse to build.
3. The business requirements (BR-xx) that every later document must trace back to.
4. The **Claims Register** (§9): the only statements we are allowed to make publicly, each with its proof status.

It exists because of one lesson from your last entry. The judge's feedback on ChronoShield was that the hedge "does not hedge": the code did something other than what the submission said it did. The hackathon rules make the same failure expensive here (see §2, R-04). So this document treats every public sentence as a promise that needs a test.

---

## 2. Hackathon context `[Sponsor]` (V: read from the Official Rules text you supplied)

### 2.1 Rules that constrain the product

| ID | Rule (paraphrased, see rules text for exact wording) | Consequence for us |
|---|---|---|
| R-01 | Build an application that integrates the PayPal developer platform (free sandbox) with an AI tool or model of our choice. PayPal integration must be central. | PayPal calls must be part of the core value, not a button. |
| R-02 | A functional demo is required: either complete setup and run instructions in the repo, or a hosted demo. A mockup, static prototype or non-functional demo does not meet this. | A judge must be able to run it. Setup instructions are a deliverable, not an afterthought. |
| R-03 | The repository must be public with an open-source license file visible in the About section. | License chosen in Sprint 0. No secrets in history, ever. |
| R-04 | The project must "function as depicted in the video and/or expressed in the text description". | **Any claim we cannot demonstrate is a rules risk, not just a scoring risk.** This is the anti-ChronoShield rule. |
| R-05 | Video under 3 minutes, public on YouTube, shows the project functioning, and must not include third-party trademarks or copyrighted material without permission. | Demo UI avoids third-party logos and brand marks where possible. Needs an explicit check (open question OQ-6). |
| R-06 | Stage 1 is pass/fail: reasonably fits the theme and reasonably applies the featured APIs/SDKs. Stage 2 scores five equally weighted criteria (below). | PayPal API use must be visible and real from the first screen of the video. |
| R-07 | Judging may use experts, peer review or "automated AI-driven analysis". | README, repo structure and text must be clear and consistent for a machine reader as well as a human. Contradictions between README, video and code are visible to both. |
| R-08 | Submissions remain the entrant's IP. Sponsor gets a non-exclusive license for judging. Sponsor and Devpost may promote the submission and contributors' names/likeness for three years. | Compatible with turning this into your own company. No ownership transfer clause found in the text I read. |
| R-09 | Submissions must be the entrant's original work. Open-source software may be used if its license is followed and the entry builds upon it. Third-party SDKs/APIs must be used within their terms. | We call WooCommerce and PayPal APIs; we do not vendor their source into our repo. License compatibility check is OQ-5. |
| R-10 | Existing projects must be significantly updated after the start of the submission period, with an explanation. | This is a new project. The README states that and dates its start. |
| R-11 | A project can win at most one Grand Prize or one Honorable Mention, plus at most one Sponsor Prize. | Plan for one main target and, optionally, one sponsor target. |
| R-12 | English-language submission materials. | Fine. |
| R-13 | Judges are not required to test the project and may judge on text, images and video alone. | The video and text must carry the proof by themselves. Run-it-yourself is a bonus, not the plan. |

### 2.2 Judging criteria (equal weight, Stage 2) `[Sponsor]` V

| # | Criterion | The question judges ask |
|---|---|---|
| J1 | Technological Implementation | Thorough, skillful use of PayPal platform and AI; genuine effort; working, non-trivial implementation? |
| J2 | Design | Complete, coherent product experience, not just a proof of concept? |
| J3 | Potential Impact | A credible, specific case for a real problem for a real audience, and does the solution actually address it based on what is demonstrated? |
| J4 | Innovation / Idea | How creative and novel, and how does it differ from existing concepts? |
| J5 | Presentation | Does the video show it working end to end, and is the pitch clear on problem, audience and why it matters? |

### 2.3 Prize structure `[Sponsor]` V (23 prize slots)

| Tier | Prizes |
|---|---|
| Grand | 1st $12,000 · 2nd $8,000 · 3rd $5,000 |
| Honorable Mention ($5,000 each) | Most Creative · Most Impactful · Best Demo Delivery · Best Use of PayPal + AI · Best Use of Agentic Commerce |
| Sponsor | AG Grid: $5,000 + $2,000 + 3 × $1,000 · APIMatic: 3 × $1,000 + subscription · Bryntum: 3 × $1,000 · Channel3: $1,500 · Render: credits (3) |

Entries as of the supplied file: about 21,660 participants `[Sponsor]`. This is a participant count, not a submission count; most will not submit.

---

## 3. Problem statement (Opportunity Canvas, filled)

| Field | Content | Source |
|---|---|---|
| **01 Problem** | A merchant's WooCommerce store and PayPal can disagree about whether an order was paid. The merchant sees a pending or cancelled order while PayPal holds an approved or captured payment, or sees a paid order PayPal never completed. Working out where the two diverged, and which correction is safe, is manual detective work. | `[Research]` E-01, E-02 |
| **02 Who has it** | Hypothesis H-1: owner-operators of WooCommerce stores that take PayPal and have no payments engineer. Hypothesis H-2: agencies and freelancers that maintain several such stores. Neither segment has been interviewed. | `[Assumption]` |
| **03 What they do today** | Read order notes and gateway logs (E-01). Upgrade the plugin hoping the bug goes away; in E-01 it did not. Build in-house recovery logic (E-02, a developer who lost a create response and could not safely replay it). | `[Research]` |
| **04 What is wrong with today's approach** | In E-01 the buyer approved payment, the capture never ran, and the order was cancelled about 70 minutes later with a note that looks identical to an abandoned checkout, so the cause is not visible from the order itself. In E-02 recovery is blocked because the order ID was never stored and replaying the create risks a second authorization. | `[Research]` |
| **05 How a solution changes their situation** | The merchant opens an order, sees PayPal's authoritative state beside WooCommerce's, gets a diagnosis grounded in recorded evidence, sees which next actions are safe and which are forbidden, approves one, and sees the result verified against both systems. | design intent |
| **06 How we would know it worked** | See BO-1 to BO-5 (§6). In short: a labelled incident test set with measured classification accuracy, zero unsafe recommendations, and verified repairs; plus real merchant conversations after the event. | targets |
| **07 What we are assuming** | ★ See §13. | `[Assumption]` |
| **08 Why us, why now** | Not established. The AI feature's reliability, latency and cost per investigation have **not been measured**. They must be measured in Sprint 1 and written back here. Until then this field stays empty on purpose. | pending |

---

## 4. Stakeholders and personas

| Stakeholder | Interest | Notes |
|---|---|---|
| Merchant (H-1) | Money not lost, customers not confused, minimal technical effort | Hypothesis. Zero interviews so far. |
| Agency or developer (H-2) | Fewer support tickets across many stores, evidence to show clients | Hypothesis. Zero interviews so far. |
| Hackathon judges (expert, peer or automated) | Working, non-trivial, honest, clearly demonstrated | The audience that decides this event. |
| Owner / builder (you) | A defensible entry, and an asset worth continuing if merchant evidence is positive | Solo; time-limited. |
| PayPal | Sandbox integration quality | Judges include the sponsor's staff. |
| Frontend agent (yours) | A clear, stable API contract and design constraints | Receives its own prompt after the TDD. |

---

## 5. Evidence base

Everything the project's story rests on, and how far each item is actually proven.

| ID | Evidence | Status | What it supports | What it does **not** support |
|---|---|---|---|---|
| E-01 | WooCommerce PayPal Payments issue #4782: after the approved-order webhook, capture never ran; order cancelled about 70 minutes later; two cases about 10 days apart; open, no workaround, no impact figure | **V** | Divergence between PayPal and WooCommerce happens in a real plugin, intermittently | How often it happens across merchants, or how much revenue is lost. In this case no money was taken. |
| E-02 | paypal/AI-Toolkit issue #36 (opened 14 Oct): developer lost a create-order response, cannot look up the result by request ID without risking a replay; no maintainer response seen | **V** | Lost-response recovery is a real developer pain | Merchant demand, or that PayPal will not add this lookup |
| E-03 | Sandbox scenario 1, order `5LV75741Y0902515G`. **Machine-recorded** (`scenario1-run-FAILED-network.json`): create at 08:14:36Z (harness clock, HTTP 200); order reads at 08:15:10Z and 08:20:10Z (HTTP 200, status not saved because the run crashed); run ended with `fetch failed` at about 08:45:19Z. **Hand-written** (`scenario1-delayed-capture-notes.txt`): later query returned APPROVED; capture HTTP 201 COMPLETED (capture `2X454753W9630121J`). **Reported on 2 Nov by the owner's review, raw file not yet supplied:** PayPal's capture `create_time` is **2026-10-30T09:04:55Z**, about **50 min 19 s** after order creation (arithmetic checked). | **R** (partly machine-backed) | A capture of this approved order succeeded about 50 minutes after the order was created. | The approval-to-capture interval: **the approval time is unknown**, and the status field of the 08:15 and 08:20 reads was not saved, so we cannot even show the order was APPROVED then. Also not supported: other delays, live behavior, any real WooCommerce interaction. |
| E-04 | Sandbox scenario 2 (`scenario2-run.json`, order `2GD52701974434709`): capture HTTP 201; then a retry with the same request ID and a retry with a new request ID both returned HTTP 201 and the same capture ID `70M65111GE664273M`. The order was read once, **before** the retries. The harness took only the first capture from each response, so a second capture appended to the list would have been invisible. | **R**, and the check was **invalid by construction** | A repeat capture call on a completed order does not return an error and returned the original capture in its response | **Anything about whether a second capture exists.** C-04 cannot be supported by this file. (My local mock predicted a 422 error; real PayPal answered 201, so the mock's assumption was wrong.) |
| E-05 | Sandbox scenario 3 (`scenario3-run.json`): create with key K returned order `9701162457099510B`; create with the same K returned the same order (HTTP 200); create with a new key returned a different order `8XA57839KH0376449`. PayPal debug IDs for all three calls are in the file. | **V** (raw file, one run) | Same-key retry returns the original order; a new key creates a duplicate | A genuinely dropped response (it was simulated), repeatability, or retention length |
| E-06 | Hackathon repo scan. I read the READMEs of four closest entries (paypal-recon-agent, settlementproof, settleproof, PayGuard Agent). None traces live webhooks together with merchant order state and proposes a repair. | **V** (four repos), search coverage is a **lower bound** | No direct rival found *so far* | That no rival exists or will appear. Repos keep appearing until Nov 12. |
| E-07 | PayPal Agent Toolkit tool list: orders (create/get/pay), invoices, subscriptions, shipment tracking, `list_transaction`, disputes (list/get/accept only). No payouts tool, no evidence-submission tool. | **V** | What the toolkit gives us for free | Behavior of each tool |
| E-08 | PayPal sandbox page: same API feature set as live; merchants can create disputes in sandbox; settle and status-update disputes are sandbox-only | **V** (as documentation) | Sandbox is a fair test bed in principle | That every feature behaves identically |
| E-09 | Reported incident links #4795, #4679, #4173, #4798 (WooCommerce PayPal Payments) | **U** | nothing yet | Must be read before being cited |
| E-10 | Claims that PayPal retries webhooks up to 25 times over three days and retains idempotency keys up to 45 days | **U** | nothing yet | Must be read in PayPal's docs before design depends on them |
| E-11 | Demand: any evidence a merchant or agency would pay for this | **none** | nothing | Commercial viability is unproven. |

**Rule:** a design decision may depend on a V item. It may depend on an R item only with the raw evidence file attached. It may not depend on a U item.

---

## 6. Business objectives and measures

Targets below are goals we will measure ourselves against, not predictions.

| ID | Objective | Measure | Target | Evidence |
|---|---|---|---|---|
| BO-1 | Pass Stage 1 clearly | Orders and captures visible within 30 seconds in the tested prototype scenarios. Webhook-based discovery is outside the prototype scope. (CR-003, approved 4 Nov by owner message) | Yes | Video timestamp list |
| BO-2a | Diagnose state-divergence incidents correctly | Classification accuracy on a labelled test set of injected incidents of the **two** state-divergence P0 types (approved-not-captured, captured-but-locally-unpaid) plus the safety stops (`multiple_captures`, `amount_mismatch`, `unknown`) | 100% on the P0 cases, ≥ 90% overall; each case reproducible | Eval report with raw outputs |
| BO-2b | Recover a lost create response without a duplicate | Over N repeated trials (N fixed in the Evidence Spec, at least 10) with a persisted request ID, the number of duplicate orders created | 0 duplicates; the original order is returned every time | Per-trial evidence files. Applies only if BR-09 is built. |
| BO-3 | Never recommend an unsafe action | Count of recommendations that include a forbidden action in the test set | 0 | Eval report |
| BO-4 | Verified recovery (**conditional on recovery being built; see §7.3 delivery tiers**) | Share of approved repairs where a re-read of both systems after the action confirms the intended state | 100% in the demo scenarios; failures are shown, not hidden. If recovery is not built, this objective is dropped, not weakened. | Per-run evidence file |
| BO-5 | Be fast enough to be useful | Median time from "investigate order" to diagnosis shown | ≤ 60 s measured on the demo machine, not estimated | Timing log |
| BO-6 | Learn whether anyone wants it | Merchant or agency conversations after the event, using the full interview guide | ≥ 5 conversations; ≥ 2 describe a matching incident in the last 90 days | Interview notes |
| BO-7 | Honest submission | Every public claim maps to an Evidence Spec item with status "proven" | 100% of claims | Claims Register |

"Working" as a number, as your playbook requires: **BO-2a and BO-3 met on the final evaluation run, plus BO-4 if recovery (Tier 2 or 3) is built.**

---

## 7. Scope

### 7.1 Building (the demo path and the real build are named in §14)

| # | Capability |
|---|---|
| B1 | Read a PayPal order's authoritative state (order, capture, timestamps) through the PayPal APIs |
| B2 | Read the matching WooCommerce order's state through an adapter (access method gated by spike S0-A) |
| B3 | Compare the two, classify the incident, and show the timeline of recorded events |
| B4 | Recommend safe actions and explicitly list forbidden ones, from deterministic rules |
| B5 | Explain the diagnosis in plain language from structured evidence only, using an AI model |
| B6 | Execute a human-approved recovery (local state repair first), then verify by re-reading both systems |
| B7 | Keep an append-only audit trail of every investigation and action |

### 7.2 Not building (longer than the building list, as the playbook demands)

| # | Not building | Why not | Comes back when |
|---|---|---|---|
| X1 | A webhook event viewer or generic PayPal dashboard | PayPal already provides event history and resend; we would be a weaker copy | Never as a standalone feature |
| X2 | Autonomous capture, refund or retry by the AI | An AI deciding on money is the failure mode this product exists to prevent | Only with deterministic gates and approval, and proven in the IVM |
| X3 | Automatic capture of an approved order whose local order is cancelled | Could charge a buyer for an order the merchant treats as cancelled | Never automatic; manual override only, if at all |
| X4 | Refund and dispute workflows | Crowded hackathon cluster (7+ repos), different problem | A merchant interview shows refunds are the main pain |
| X5 | Subscription and failed-recurring-payment recovery | Different data and APIs; on the organizer's idea list | Core incident types prove out and merchants ask |
| X6 | Reconciliation of fees, payouts and accounting | Crowded cluster and a paid-incumbent market; different product | Not planned |
| X7 | Platforms other than WooCommerce (Shopify, Magento, custom) | Evidence exists only for WooCommerce | WooCommerce adapter proven and a second platform shows demand |
| X8 | Multi-tenant SaaS, merchant accounts, billing | Does not test the riskiest assumption | A paying merchant exists |
| X9 | Production PayPal (live) environment | Sandbox only; no real money or real customer data | After Phase-7 hardening and merchant consent |
| X10 | A mobile app | Browser is enough | Usage data |
| X11 | Auto-installing agents or plugins on merchant servers | Security surface and trust burden | A merchant needs it and a safe design exists |
| X12 | Claims about revenue saved, market size or competitors absent | No evidence (see §9) | Evidence exists |
| X13 | Full financial reconciliation (multiple partial captures, order totals, aggregate amounts, refunds, currency conversion) | The classifier checks one capture against one expected amount; anything broader is a different, crowded product | A merchant interview shows amount errors are the main pain, and tests exist |
| X14 | Incident types beyond the three P0s (webhook failed, duplicate webhook, duplicate local order, pending misclassified) | RK-8 trigger fired; depth on three beats breadth on seven | After the event, once the P0 types are validated against WooCommerce |


### 7.3 Delivery tiers (what we ship if time or safety runs short)

| Tier | What it is | Status | Fallback rule |
|---|---|---|---|
| **1 Read-only diagnosis** | Reads both systems, classifies P0-A and P0-B, shows evidence and the safe and forbidden actions. Moves no money and changes nothing. | **Must.** This is the product floor. | If anything below cannot be done safely and verified by Sun 8 Nov, we ship Tier 1 and say so. |
| **2 Human-approved local repair** | After approval, updates the WooCommerce order status and verifies by re-reading both systems (BR-06). | Should | Dropped if the adapter cannot write safely. |
| **3 Human-approved capture** | After approval and eligibility checks, captures a PayPal order. | Could | Only after Tier 2 passes its tests; never automatic (X3). |
| **Side component** | Request-recovery (BR-09) | Should | Dropped first if time is short. |

A working, honest diagnostic product beats an impressive recovery workflow that has not been verified.

---

## 8. Business requirements

Priority uses MoSCoW. "Verified by" points to the Implementation Verification Matrix (document 07), where each row will name a test and an evidence file. IDs here are stable; the SRS will derive SR-xx requirements from them.

| ID | Requirement | Rationale and source | Pri | Business-level acceptance | IVM |
|---|---|---|---|---|---|
| BR-01 | The system shall show, for a given order, PayPal's authoritative state and the merchant platform's state side by side with their timestamps. | The core question: who is right? E-01 | Must | A reviewer can read both states and their times for any investigated order | IVM-BR-01 |
| BR-02 | The system shall diagnose **state-divergence incidents** by comparing PayPal's authoritative state with the merchant platform's state. v1 types: **P0-A approved-but-not-captured** and **P0-B captured-but-locally-unpaid**. The classifier also reports safety stops `multiple_captures`, `amount_mismatch` and `unknown`, which are not claimed as validated incident types. **The lost create response is NOT a classifier incident**: it is handled by the separate request-recovery component of BR-09. Out of v1 (Won't): webhook delivery failed, duplicate webhook, duplicate local order, pending misclassified. | E-01; sandbox harness; RK-8 trigger; review of 2 Nov | Must (P0-A, P0-B) | BO-2a met on the labelled set | IVM-BR-02 |
| BR-03 | The system shall report the disagreement it observed between the two systems' reads and the time it was observed, shall not state when the underlying disagreement began, and shall say clearly when the evidence is too incomplete to report a divergence. | The product's differentiator. Must not overclaim "root cause". | Must | For each test case the reported observed disagreement matches the labelled answer, or the system abstains (fixture parity; not a measure of diagnostic accuracy) | IVM-BR-03 |
| BR-04 | The system shall recommend only actions that pass deterministic safety rules and shall list forbidden actions with reasons. | BO-3; E-03, E-04 | Must | Zero unsafe recommendations on the test set | IVM-BR-04 |
| BR-05 | No money-moving operation (capture, refund, retry) shall execute without deterministic state verification, idempotency protection and explicit human approval. | Core safety principle | Must | Attempts to bypass approval are refused in tests | IVM-BR-05 |
| BR-06 | After any approved action, the system shall re-read both systems and report whether the intended state was reached. A failed repair shall be reported as failed. | BO-4; the ChronoShield lesson: the action must do what it says | Should (only if recovery is built; see §7.3) | Verification record exists for every executed action | IVM-BR-06 |
| BR-07 | An AI model shall explain the diagnosis using only structured evidence supplied by the deterministic engine, cite the evidence items it used, and abstain when evidence is insufficient. It shall have no ability to execute actions. | Judging J1; safety | Must | Explanations contain citations that resolve to real evidence items; abstention case demonstrated | IVM-BR-07 |
| BR-08 | The system shall keep a tamper-evident, append-only audit trail of investigations, recommendations, approvals and actions. | Trust; PayGuard Agent shows judges have seen this pattern, so ours must be correct, not just present | Should | Chain verification passes; a modified record is detected | IVM-BR-08 |
| BR-09 | A **request-recovery component**, separate from the classifier, shall persist each PayPal-Request-Id before a create call is sent, detect a create whose response was lost, retry with the same stored ID, and warn when no ID was persisted. It is demonstrated in the reference store. **No claim is made that it applies to merchants running the WooCommerce plugin**, because the plugin, not our product, controls those requests (E-02 is a developer-integration problem). | E-02, E-05 | Should (can be dropped without failing v1) | BO-2b met: zero duplicate orders over the trials | IVM-BR-09 |
| BR-10 | The project shall be runnable by a judge from the repository with documented setup, using only sandbox credentials and a seeded scenario set. | R-02, R-13 | Must | A clean-machine run following the README reproduces the demo scenarios | IVM-BR-10 |
| BR-11 | Incidents used in the demo shall be reproducible on demand by a documented injection method, and the demo shall disclose which incidents are injected. | Honesty; E-01 is intermittent in the wild | Must | Injection script and disclosure text exist | IVM-BR-11 |
| BR-12 | Every public statement (README, Devpost text, video narration, UI copy) shall map to a Claims Register entry whose status is "proven". | R-04; BO-7 | Must | Claim audit passes before submission | IVM-BR-12 |
| BR-13 | The repository shall be public with an open-source license and shall contain no secrets in its history. | R-03 | Must | License visible in About; secret scan clean | IVM-BR-13 |
| BR-14 | The system shall minimise and redact personal data: sandbox accounts only, no real customer data, logs redact emails and addresses. | Privacy and R-09 (third-party terms) | Should | Log sample inspected; redaction tests pass | IVM-BR-14 |
| BR-15 | The merchant interface shall consume a documented, versioned API and shall be built by the owner's separate frontend agent from a written prompt and design constraints. | Owner's workflow | Must | API contract exists and the UI uses only it | IVM-BR-15 |
| BR-16 | The system shall be usable within a three-minute video: one scenario from alert to verified result in under 90 seconds of footage. | R-05, J5 | Must | A timed rehearsal recording | IVM-BR-16 |

---

## 9. Claims Register

This is the anti-ChronoShield control. A claim may be written in any public material only when its status is **PROVEN**, with the evidence file named. Each claim also records the strongest wording that is currently allowed.

### 9.1 Status definitions

`PROVEN` evidence file exists and the IVM row is green · `PARTIAL` some evidence, limits stated · `UNPROVEN` no usable evidence · `FORBIDDEN` we will not claim it unless the listed condition is met.

### 9.2 Register (initial)

| ID | Draft claim | Status today | Strongest wording allowed now | To reach PROVEN |
|---|---|---|---|---|
| C-01 | "Detects PayPal orders that are approved but never captured while the store shows them as pending or cancelled." | PARTIAL | "Classifies this state from PayPal order data and a store status." (local state was simulated) | Reproduce with a real WooCommerce order via adapter (spike S0-A/B); eval cases pass |
| C-02 | "A delayed capture of an approved order can still succeed." | PARTIAL (optional claim; we may simply not make it) | "In one PayPal Sandbox experiment, an approved order was subsequently captured. The capture timestamp was about 50 minutes after order creation. The exact approval-to-capture interval is unknown." (Applies to this one run only.) | For **future** runs on harness v0.3 the interval is stated as "at least N minutes after PayPal was first observed reporting APPROVED". A second long run is not needed for the product and is paused. |
| C-03 | "A lost create response is recoverable by retrying with the same request ID; a new ID creates a duplicate." | **PROVEN for the narrow wording** (raw file `scenario3-run.json`, one run) | "In a sandbox test that simulated a lost response, retrying with the same PayPal-Request-Id returned the original order and a new ID created a different order." Must say simulated. | Wider: interrupt a real request after PayPal processed it; repeat the test several times |
| C-04a | "Retrying a capture with the same or a new request ID is handled safely by PayPal." | PARTIAL (one run, final read missing) | "In one sandbox run, repeating a capture call returned HTTP 201 and the original capture ID." | Harness v0.3 scenario 2, with **both retries returning success** and warnings absent. Retry warnings must stay visible in any reported result. |
| C-04b | "After the retries, the sandbox order contains exactly one capture." | UNPROVEN until a v0.3 run exists | none | `node run.js 2` on harness v0.3: final read succeeds and lists exactly one capture. This proves the final count only, **not** that idempotency worked for every retry (C-04a). |
| C-04 | "The system never captures a payment twice." (the product claim) | **FORBIDDEN** as worded | "In our sandbox test, the final order contained one capture after repeated capture calls." | Would need concurrent-request tests, several order states and a design with no capture path that bypasses the gate (see C-12). Never use "never". |
| C-05 | "Recovers stuck orders." | UNPROVEN | none | BO-4: verified post-action state on every demo scenario |
| C-06 | "AI finds the root cause." | FORBIDDEN | "Explains a diagnosis from recorded evidence." | Measured accuracy on labelled set; abstention shown. Never say "root cause" unless the evidence supports it in that case. |
| C-07 | "Faster than manual investigation." | FORBIDDEN | none | A measured baseline of a manual investigation, with method stated |
| C-08 | "Merchants lose revenue to this problem." | FORBIDDEN as a general claim | "Public issue reports show orders cancelled after buyer approval." | Interview or data evidence of frequency and cost |
| C-09 | "No existing product does this." | FORBIDDEN | "In the hackathon repos and products we reviewed (named in README), we did not find one that does X." | Cannot be proven. Never claim absence. |
| C-10 | "Works with WooCommerce." | UNPROVEN | none | Adapter tested against a real WooCommerce install with the PayPal Payments plugin (state versions) |
| C-11 | "Audit log is tamper-evident." | UNPROVEN | none | Tamper test passes in IVM |
| C-12 | "Safe by design / the AI can't move money." | UNPROVEN | none | Architecture shows no code path from model output to payment API without gate and approval; test attempts bypass |
| C-13 | "Reconciles payments" / "verifies the amount paid" | **FORBIDDEN** | "Flags one capture whose amount or currency differs from the amount the merchant expected." | Only after multi-capture totals, partial captures, refunds and currency conversion are implemented and tested (not in v1) |

### 9.3 Claim rules

1. Each public sentence cites a claim ID in a private checklist. No ID, no sentence.
2. Words to avoid unless proven by a named test: **guarantees, prevents, eliminates, zero, autonomous, root cause, always, never, fully, instantly, production-ready.**
3. Simulated is not real. If an input, state or failure was simulated, the sentence says so.
4. The demo says which incidents are injected (BR-11). Injected failures are fine; hidden injection is not.
5. A claim's wording follows the weakest evidence under it, not the strongest.
6. Before submission, run a claim audit (IVM-BR-12): read README, Devpost text, video script and UI copy, and tick every sentence against this register.

### 9.4 The ChronoShield test

Before each lock and before submission, ask for every feature: *If a judge reads the code for this feature, does the code do what the description says, on the case the description implies, not just on the happy path?* If the answer needs a "but", fix the code or the sentence.

---

## 10. Judging criteria mapped to deliverables and effort

Equal weights mean effort should not pile onto one criterion.

| Criterion | What earns it here | Deliverable | Share of build effort |
|---|---|---|---|
| J1 Technology | Real PayPal Orders/Payments/Webhooks calls, deterministic engine, verified recovery, grounded AI | Engine, adapters, eval report | 35% |
| J2 Design | A coherent investigation flow, built by your UI agent from a strong prompt | UI prompt, API contract | 20% |
| J3 Impact | A specific problem with cited public incidents, honest limits, merchant follow-up plan | README problem section, E-01/E-02 | 15% |
| J4 Innovation | Cross-system divergence diagnosis plus safe recovery (not a webhook viewer) | Differentiation table with named repos | 10% |
| J5 Presentation | Under-3-minute video, one clean scenario, claims audited | Script, recording, backup | 20% |

---

## 11. Constraints, assumptions and dependencies

| Type | Item |
|---|---|
| Time | 13 days to the deadline (counting 30 Oct). Features freeze at end of Tue 10 Nov. |
| People | One builder. Frontend by a separate agent supervised by the owner. |
| Environment | PayPal sandbox only. Sandbox endpoints are not reachable from my working environment, so all live checks are run by the owner, and results come back as raw files. |
| Dependency | WooCommerce plus PayPal Payments plugin behavior and data fields (spike S0-A). Not yet known. |
| Dependency | An AI model API, with measured reliability, latency and cost (Sprint 1). |
| Assumption | `[Assumption]` PayPal sandbox behaves like live closely enough to demonstrate the incidents. Not verified. |
| Assumption | `[Assumption]` The WooCommerce REST API exposes enough order data. Not verified; the earlier plan warned against assuming it. |
| Constraint | No real customer data. No live money. |
| Constraint | Open-source license on a public repo. |

---

## 12. Risks and kill criteria

| ID | Risk | Likelihood | Impact | Mitigation | Kill / pivot trigger |
|---|---|---|---|---|---|
| RK-1 | Demand is unproven: merchants fix these bugs themselves or do not care | High | High for the business, lower for the hackathon | BO-6 interviews; do not claim demand | If interviews show no one has had a matching incident, record it and stop investing after the event |
| RK-2 | The WooCommerce adapter cannot read the PayPal order ID or capture data we need | Medium | High | Spike S0-A in Sprint 0 | If unreadable, switch the adapter to webhook-plus-order-note correlation or a reference store (PDR decision) |
| RK-3 | We cannot reproduce a real divergence in WooCommerce on demand | Medium | High | Spike S0-B; injection recipe; disclosure | If neither real nor injected divergence works in WooCommerce, use a reference store and say so plainly |
| RK-4 | Overclaiming (the ChronoShield risk) | Medium | High, and a rules issue (R-04) | §9, IVM-BR-12 | Any unprovable claim is removed, not defended |
| RK-5 | Polished rivals (several have 90 to 390 tests) | High | Medium | Evidence discipline and a verified end-to-end demo beat feature count | n/a |
| RK-6 | Third-party trademarks in the video (R-05) | Medium | Medium | Open question OQ-6 | If unclear, avoid logos and brand marks on screen |
| RK-7 | The AI explanation is wrong or unstable | Medium | High | Evidence-only prompting, citation check, abstention, eval set | If accuracy on the labelled set is below target, ship deterministic diagnosis with AI as optional summary |
| RK-8 | Time overrun from documents | Medium | High | Sprint 0 capped at 3 days; docs trimmed to what the build needs | If Sprint 0 passes Sun 1 Nov, drop P1/P2 incident types |
| RK-9 | Sandbox network interruptions disrupt evidence runs | Medium | Low | Preserve partial evidence; retry with the same stored request ID | n/a |
| RK-10 | A rival ships the same combination before Nov 12 | Low to medium | Medium | Re-scan repos weekly; differentiate on verified recovery | n/a |
| RK-11 | Safe, verified recovery cannot be built in the remaining time, or WooCommerce will not accept safe writes | Medium | Medium | Delivery tiers (§7.3) make Tier 1 the floor | Apply the fallback on Sun 8 Nov at the latest |

---

## 13. Riskiest assumption

> **From PayPal's APIs plus the WooCommerce REST API alone, the system can reliably establish which of the two systems is wrong about an order, without access to the merchant's server logs.**

Fatality × confidence ranking for the assumptions we depend on:

| # | Assumption | If false | Confidence today | Test |
|---|---|---|---|---|
| A1 ★ | The two APIs alone are enough to locate the divergence | The core promise collapses to "we show two statuses" | Low (adapter unexamined) | S0-A, then eval set |
| A2 | The WooCommerce PayPal Payments plugin stores PayPal order and capture IDs in a readable place | Adapter cannot match orders | Unknown | S0-A |
| A3 | A real divergence can be induced on demand for a demo | Demo relies only on a reference store | Unknown | S0-B |
| A4 | An AI model can explain structured evidence reliably enough | Fall back to deterministic text | Medium | Sprint 1 reliability, latency, cost test |
| A5 | PayPal sandbox behavior matches what we claim from E-03 to E-05 | Claims must be reworded | Medium (one run each) | S0-C with raw files |
| A6 | Someone would use or pay for this | Business case fails (hackathon entry still stands) | Unknown | BO-6 |

---

## 14. Two builds, named now

| | Demo path | Real build |
|---|---|---|
| Purpose | Land one clean scenario in under 90 seconds of video | Survive messy input and prove the riskiest assumption |
| Data | Seeded scenarios, injected incidents, disclosed as such | Arbitrary order IDs against the live sandbox |
| AI | May use a cached explanation only if clearly labelled in the README (never in the video as live) | Live call; reliability, latency and cost measured |
| What must be real in both | The deterministic classification, the safety gates, the post-action verification, the PayPal API calls |  |

**Demo Honesty Ledger:** a table in the README listing every shortcut in the demo path. It is written as shortcuts are made, not afterward. An empty ledger at submission means we forgot to write it, not that we took no shortcuts.

---

## 15. Agile delivery plan

### 15.1 Cadence

Short sprints, a working increment at the end of each, a demo to you, and a retro that updates the Claims Register. Nothing downstream starts on an unapproved upstream document, **except the bounded exception in §15.1a**. Frontend work starts only after the TDD is locked and the API contract is published.

### 15.1a Bounded process exception (resolves OQ-11)

Rule: **independent work may proceed; gated work may not.**

Once the SRS is locked, the following may start before the other documents are locked: PayPal client work that does not depend on unresolved requirements; deterministic engine scaffolding and tests, reusing the harness; refactoring and re-validation of behavior already prototyped.

Even after the SRS is locked, the following may **not** start until their gate is cleared: a WooCommerce adapter built on guessed metadata (gate: S0-A result file); final incident-classification logic that depends on S0-A; any recovery or capture execution (gate: Threat Model and the relevant safety requirements locked). Starting independent work is not permission to finalize a gated design decision, and progress on the engine must never be used as pressure to declare a spike successful.

### 15.2 Calendar

| Sprint | Dates | Goal | Exit gate |
|---|---|---|---|
| 0 | Fri 30 Oct to **Tue 3 Nov** | BRS locked; SRS and Threat Model drafted together with every WooCommerce-dependent item marked GATED; **S0-A result in hand** | **S0-A is the critical gate.** Documents that depend on its outcome (SRS adapter requirements, PDR, TDD) stay explicitly GATED until it answers, then lock. The remaining documents do not wait for each other. |
| 1 | **Wed 4 to Thu 5 Nov** (compressed from three days) | Deterministic engine, PayPal client, WooCommerce adapter, incident injection, stabilized harness; AI feasibility numbers | P0 incidents classified from real data; reliability/latency/cost recorded |
| 2 | **Fri 6 to Sun 8 Nov** | Investigation timeline, AI explanation, approved recovery with verification, audit trail | BO-3 and BO-4 pass on demo scenarios |
| 3 | **Mon 9 to Tue 10 Nov** | API contract final, UI integrated, evaluation run, security pass, README | **Feature freeze end of Tue 10 Nov.** Claim audit drafted. |
| 4 | Wed 11 to Thu 12 Nov | Video, backup recording, submission | Submitted **by 15:00 GMT+3 on 12 Nov** (8 hours before the deadline) |

### 15.3 Definition of Ready (a story may start)

Requirement ID known · IVM row exists · test approach named · no open GATED-BY-SPIKE dependency. (A story that has no gated dependency may start under §15.1a even if sibling documents are still being written; a story with a gated dependency may not.)

### 15.4 Definition of Done (a story is finished)

Code merged and passing tests · IVM row green with an evidence file committed · Claims Register updated · Demo Honesty Ledger updated if a shortcut was taken · no secrets · reviewed against the ChronoShield test (§9.4).

### 15.5 Change control

After lock, a change request names: what changes, why, which documents and requirements it touches, and the effect on the calendar. Only you approve it.

---

## 16. Open questions

| ID | Question | Owner | Needed by |
|---|---|---|---|
| OQ-1 | Which WooCommerce PayPal Payments plugin metadata is readable via the REST API? (spike S0-A) | Owner | Before SRS lock |
| OQ-2 | Real WooCommerce install in the demo, or a reference store with a thin adapter? Decision criteria: reproducibility for judges, setup time, ability to induce divergence | Joint, at PDR | PDR |
| OQ-3 | Pursue a sponsor prize (AG Grid for the timeline table is the largest pool)? It affects the stack and the UI prompt | Owner | PDR |
| OQ-4 | Who are the five merchants or agencies for post-event interviews? Start the list now | Owner | Before 12 Nov |
| OQ-5 | License choice and compatibility with WooCommerce/PayPal usage (I have not verified the licenses) | Owner | Sprint 0 |
| OQ-6 | May the video show PayPal or WooCommerce names or logos? Rules say no third-party trademarks without permission | Owner, check with PayPal DevRel on the hackathon Discord | Sprint 3 |
| OQ-7 | ~~Send raw result files~~ and ~~retrieve the capture time~~ **Resolved in substance on 2 Nov** (capture `create_time` 2026-10-30T09:04:55Z reported). Remaining: please save the full GET JSON of order `5LV75741Y0902515G` into `evidence/` so E-03 can be promoted from R to V. Also note the harness clock (08:14:36.117Z) and PayPal's `create_time` for the order may differ by about a second; use PayPal's own value | Owner | S0-C |
| OQ-8 | Do my readings of PDR, TDD and IVM match what you meant? (see index) | Owner | Before SRS |
| OQ-9 | Is the deadline timezone confirmed on the Devpost page as Thu 12 Nov, 11:00 pm GMT+3? | Owner | Now |
| OQ-10 | ~~Is the lost create response in scope?~~ **Resolved 2 Nov:** kept as a separate Should-level component (BR-09), no WooCommerce claim, dropped first if time is short | Owner | closed |
| OQ-11 | ~~Process exception~~ **Resolved 2 Nov, approved with boundaries:** see §15.1a | Owner | closed |

---

## 17. Approval and lock

**Approved and locked on Mon 2 Nov 2026 as v1.0.** The original lock procedure is kept below for the record. On approval:

1. This file becomes **v1.0 LOCKED**.
2. I begin document 02 (SRS), deriving SR-xx requirements from BR-01 to BR-16 and the P0 incident taxonomy.
3. The Claims Register (§9) becomes the controlling list for all public text.

Approval checklist for you to consider before replying:

- [ ] The problem statement describes a situation, not a product.
- [ ] You accept that demand evidence is zero today (E-11) and will be tested after the event (BO-6).
- [ ] You accept the exclusion list, especially X2 and X3 (no autonomous or automatic money movement).
- [ ] You accept the claim rules in §9.3, including the avoid-list.
- [ ] You accept the Sprint 0 limit of three days and the Tuesday 10 Nov feature freeze.
