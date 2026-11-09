# S0-A result and change request CR-001

| Field | Value |
|---|---|
| Date | Tue 3 Nov 2026 |
| Evidence status | **V for the five shareable files** (3 Nov, 14:47): I received `s0a-out-shareable.zip` and `sha256sum -c` passed on all five shareable files (`wcOrder`, `wcNotes`, `wcGateways`, `ppOrder`, `summary`), now stored in `evidence/s0a-2026-11-03/shareable/`. The four `raw/` files were deliberately not sent, so their hashes in `SHA256SUMS` are unchecked; they remain **R**. The files agree with the earlier pasted report (`REPORT-as-pasted-by-owner.txt`) on the order and capture IDs, `custom_id` 13, `invoice_id` dadceb-13, `processing`, and the timestamps. This run predates the scrubber fix: `wcOrder.json` still shows `"[token]"` as a meta key name. No email addresses found in the shareable files. |
| Scope | One order, one run, one plugin version. WordPress 7.1.4, WooCommerce 11.2.1, WooCommerce PayPal Payments 4.2.0, PHP 8.2.31, MySQL 8.0, local Docker, sandbox, block checkout (`created_via: store-api`), virtual product, quantity 4, USD 40.00. |

## 1. What the single happy-path order showed (as reported)

| Q | Answer | Where | Caveat |
|---|---|---|---|
| Q1 PayPal order ID readable via REST | Yes | `meta_data` key `_ppcp_paypal_order_id` | Underscore-prefixed (internal) key. Name is the plugin's choice and can change between versions. |
| Q2 Capture ID readable via REST | Yes | `transaction_id`, and in two order notes | One capture only. |
| Q3 Status after a successful payment | `processing` | `status` | One order; virtual, not downloadable. Not evidence for other product types. |
| Q4 Paid date | `date_paid_gmt` present (09:20:20) | order | Second precision. |
| Q5 Timestamped notes | 4 notes, with `date_created_gmt` | `/orders/13/notes` | **No note records a status change.** The notes cannot be used as a status history. |
| Q6 Setup | about 25 min; PayPal connected by direct credentials, no public URL needed | owner report | Needed fixes: Compose plugin missing, WordPress version, virtual product (a physical product failed with `SHIPPING_ADDRESS_INVALID` because no shipping zones existed). |

## 2. Findings I did not ask about
1. **Reverse link on the PayPal side.** The PayPal order and the capture both carry `custom_id: "13"` (the WooCommerce order ID) and `invoice_id: "dadceb-13"`. So a PayPal order points back at its WooCommerce order. Two-way agreement (WooCommerce meta names the PayPal order, and the PayPal order's `custom_id` names the same WooCommerce order) is a much stronger match rule than either direction alone.
2. **Timing in this run.** WooCommerce order created 09:17:22; PayPal order and capture both created 09:20:13Z (order `create_time` = `update_time` = capture `create_time`); WooCommerce `date_paid_gmt` 09:20:20, 7 s after the capture. One observation. It supports nothing general. It does show that this flow creates and captures within the same second, unlike our earlier harness order.
3. **Scrubber defect.** In the shareable `wcOrder.json` the meta key `_wc_order_attribution_session_start_time` became `"[token]"`. My redaction treats any 40+ character identifier as a token. A real ID would not be lost here, but the regex can mangle long field names. I have not seen how your agent's two edits to `capture.mjs` changed this; the pasted output still shows it.
4. **Sandbox identifiers** (`account_id`, `merchant_id`) appear in `ppOrder.json`. They are sandbox values; check before sharing more widely.

## 3. What this does NOT show (the important part)
- **Nothing about an incident.** The order is healthy: capture COMPLETED, WooCommerce `processing`. We have seen zero diverged orders.
- **Whether the PayPal order ID is stored on the WooCommerce order *before* the capture.** The meta rows (ids 165 to 173) look like one batch written at payment time. If the ID is written only after a successful capture, then for an **approved-but-never-captured** order (P0-A) WooCommerce may hold no PayPal order ID, and our linking from the store side fails exactly when it matters. This is now the riskiest remaining question and the reason for spike S0-B (below).
- Behavior for physical products, downloadable products, other payment sources, refunds, or other plugin versions.

## 4. Consequence for the riskiest assumption (A1/A2)
A2 ("the plugin stores PayPal order and capture IDs in a readable place") is **supported for the successful path, on one order**. A1 ("the two APIs alone can establish which system is wrong") is **not yet tested**, because no diverged order exists. Claim C-10 stays UNPROVEN.

## 5. Change request CR-001 against the locked SRS v1.0 (needs the owner's approval)
| # | Change | Reason | Affects |
|---|---|---|---|
| 1 | SR-F-06 becomes: read `paypalOrderIdRef` from order `meta_data` key `_ppcp_paypal_order_id`, **for the plugin version recorded in the evidence only**. Version and key are configuration, not constants. Fallbacks (notes, `transaction_id`) are not used for matching. | S0-A Q1 | SRS 5, TDD |
| 2 | **(Revised 3 Nov after review.)** Add an identity result with two states. **Confirmed:** the PayPal order's `purchase_units[0].custom_id` names a WooCommerce order whose `_ppcp_paypal_order_id` equals that PayPal order's ID; only then is `match.localCount` 1. **Unresolved:** either side missing or contradictory. Unresolved identity produces verdict `unknown` with reason `link_unresolved:<specific cause>` (for example `store_has_no_paypal_order_id`, `paypal_custom_id_missing`, `ids_disagree`) and a plain finding, "Unable to link this WooCommerce order to a PayPal order using the available evidence." It is never treated as healthy or as an incident, and it is reported as a finding, not as an ordinary failure. Do not search WooCommerce by meta. | Finding 1; S0-B may show that a missing store-side ID is itself the stuck-payment signature | SRS 5, engine input, UI copy |
| 3 | SR-F-07: confirm `processing` and `completed` as paid **for this flow only**; keep other statuses as already mapped; refunded stays `unknown`. | S0-A Q3 | normalization |
| 4 | SR-F-11: no change. Event time stays off. Notes carry no status-change entries, so there is no history source. | Q5 | none |
| 5 | Add requirement: the adapter records the plugin name and version it read, and refuses to produce a verdict (returns `unknown`) when the plugin version is not on a recorded list. | Key names are plugin-internal | SRS 5, 10.3 |
| 6 | SR-N-12: the redaction regex must not rewrite field names or keys; redact values only where the key is on a sensitive list or the value looks like a token. Add a regression test with the long meta key above. | Finding 3 | redact.js, tests |
| 7 | Add spike **S0-B (revised)**: determine whether `_ppcp_paypal_order_id` exists on the WooCommerce order while the payment is approved but not captured. Gate: P0-A requirements. | Section 3 | PDR |

These are proposals. The SRS stays locked until the owner writes "approve CR-001". Reviewer position (3 Nov): direction approved; items 3 and 1 only for the recorded plugin version and tested flow; item 2 revised as above; item 7 approved immediately. That is a review, not the owner's approval. Item 6 was a bug fix inside the existing SR-N-12 and is already done (build 0.3.5).

## 6. S0-B experiment (the next result that matters)
Do not capture, retry or otherwise "rescue" the payment to make the experiment work. We want the interrupted flow exactly as it stands.

Make a second sandbox order. At the PayPal approval step, approve the payment, then **close the tab before returning to the store**. Wait 2 to 3 minutes. Then run `capture.mjs` with the new WooCommerce order number and the PayPal order ID (find it in the PayPal sandbox dashboard under the business account, or in the PayPal Developer "API calls" log). Report: does a WooCommerce order exist, with what status, and is `_ppcp_paypal_order_id` present. If no WooCommerce order exists at all, say that.
If the PayPal order ID cannot be found, tell me what you did see; that is also a result.

---

## 7. S0-B result so far (3 Nov, 15:25): the decisive case is still NOT observed

**Verified (V), from `e942bf3b-s0b-out-shareable.zip`:** five shareable files pass `sha256sum -c`; stored in `evidence/s0b-2026-11-03/`. It is **WooCommerce order 17**, PayPal order `6B462964L3390141D`: a second **completed** order (status `processing`, capture COMPLETED, 60.00 USD). Same field layout as order 13: `_ppcp_paypal_order_id` present, `transaction_id` = capture ID, `custom_id` = 17, notes without status-change entries. The scrubber fix works in real output (`_wc_order_attribution_session_start_time` preserved). No email addresses in the files.

**Reported only (R), not in any file I hold:** the owner's agent says order 12 failed at checkout (`SHIPPING_ADDRESS_INVALID`), was never captured, and still has `_ppcp_paypal_order_id` in the database; and that the plugin's `EarlyOrderHandler` writes the ID at order creation. The agent called this "conclusively verified". I do not accept that wording: there is no source file or database dump in evidence, and order 12 failed *before* any buyer approval, so it is not the approved-but-not-captured case. It is consistent with the ID being stored early. It does not prove it for an approved order.

**Not done:** an order that was approved at PayPal and never captured. Order 17 completed normally, so the interruption did not happen. Question A2-bis ("is the ID on the WooCommerce order, and is the PayPal order APPROVED but uncaptured, when the store callback never completes?") is open. CR-001 item 7 is therefore **not resolved**.

**New observation (two samples):** in both orders the PayPal order `create_time`, `update_time` and the capture `create_time` are identical to the second, and later than the WooCommerce order's creation (order 17: WooCommerce 12:13:30, PayPal 12:14:08, `date_paid_gmt` 12:14:10). Unexplained. Do not treat the PayPal order `create_time` as the time the order was created in this flow (guarded by a test).

**CR-001 status:** the owner's message of 3 Nov 15:25 contains "approve CR-001". Items 1 to 6 applied as SRS v1.1 and build 0.4.0. Item 7 stays open.

### Next experiment (S0-B, attempt 2): make the callback fail on purpose
1. Make a new order up to the PayPal approval window as before.
2. **Before** you click the final approve/continue button in the PayPal window, run `docker pause docker-wordpress-1` (adjust the name to yours).
3. Approve at PayPal. The store cannot answer; expect an error or a hang in the browser. Close the tab.
4. Wait 2 to 3 minutes, still paused, then `docker unpause docker-wordpress-1`. **Do not retry, refresh, or capture.**
5. Find the new WooCommerce order number (WooCommerce → Orders) and the PayPal order ID, then run `capture.mjs` from build 0.4.0 and send the shareable files.
Record: does a WooCommerce order exist, its status, whether `_ppcp_paypal_order_id` is present, and the PayPal order's `status` (APPROVED would be the P0-A case).

---

## 8. S0-B attempt 2: stuck order OBSERVED (4 Nov, 08:35)

**Status: V for the five shareable files.** I received `s0b-uncaptured-shareable.zip` (archive SHA-256 `31bfa985…118e14`, matching the owner's agent's figure). `sha256sum -c` passes on all five shareable files; they are stored in `evidence/s0b-uncaptured-2026-11-03/` and used as test fixtures (`app/test/fixtures/s0b-*-20.json`). What I read in the files matches the report below, except that **"absent from the database" is still R**: only the REST `meta_data` is in evidence. No email addresses in the files. I did not adopt the agent's edits to this document (it called item 7 "completely resolved"); my copy is canonical, and item 7 is answered for **this one interruption method only**.

**What the files show (one order, one interruption method: container paused during approval):**
- WooCommerce order 20 (REST): status `pending`, `needs_payment` true, total 20.00 USD, no `date_paid`, empty `transaction_id`, no order notes, and **no `_ppcp_paypal_order_id`** among its 14 meta keys.
- PayPal order `4EL84369TC886673M`: `status` APPROVED, intent CAPTURE, no captures, `custom_id` "20", `invoice_id` "dadceb-20".
- Our engine (build 0.4.0 plus the order 20 fixtures, run by me) on those files: identity unresolved (`store_has_no_paypal_order_id`), verdict `unknown`, only `ask_human_to_review`, no write action.

**This changes the product:**
1. For the approved-but-uncaptured case (P0-A) the store holds **no** PayPal order ID, so the two-way identity rule of SRS v1.1 (SR-F-08a) can never confirm it. Under that rule the headline incident is reported as "unable to link". That is honest, but it means the engine cannot diagnose P0-A as written.
2. The link still exists from the PayPal side: `custom_id` = the WooCommerce order number and `invoice_id` = a site prefix plus that number. A PayPal-initiated investigation can read WooCommerce order 20 from it.
3. **Discovery is a separate problem.** PayPal's Orders API has no "list approved, uncaptured orders" call, and Transaction Search lists only completed transactions. To investigate such an order we must be handed its PayPal order ID (merchant input, or a `CHECKOUT.ORDER.APPROVED` webhook event, which needs a reachable URL).
4. What is not established: this is one order and one way of interrupting the flow. Other interruptions (browser crash, network drop, timeouts) may behave differently.

### Draft CR-002, revision 2 (4 Nov, after review). **APPROVED by the owner, 4 Nov 09:24** (message text "approve CR-002"); applied as SRS v1.2 and build 0.5.0. Items 1 to 3 and 5 as written; item 4 stays a PDR decision
| # | Proposed change | Why |
|---|---|---|
| 1 | Add identity state **`provisional_association`** (not "confirmed"). It holds only when ALL are true: the PayPal order has exactly one purchase unit; `custom_id` names an existing WooCommerce order; `invoice_id` ends with `-<that order id>` (and carries the configured site prefix when one is configured); PayPal amount and currency equal the WooCommerce order's total and currency; and the WooCommerce order has **no** `_ppcp_paypal_order_id`. `custom_id` and `invoice_id` are both fields of the same PayPal order, so they corroborate each other but are **not independent proof** of ownership. | The only link that exists for P0-A (S0-B order 20) |
| 2 | In that state the verdict may be `approved_not_captured` (or its locally-cancelled variant) **only**, with `identityBasis: "provisional_association"` carried in the result and in every explanation. Required wording: "PayPal order appears associated with WooCommerce order N based on PayPal-side identifiers and matching amount and currency. WooCommerce does not contain the PayPal order ID, so identity is not confirmed." Never `ok`. Never `captured_local_unpaid` (that verdict still requires confirmed two-way identity). | Keeps the weaker link visibly weaker |
| 3 | Tier 1 only for this state: no approval-requiring action, no capture, no write of any kind, in any tier. | A provisional link must not move money or change a store |
| 4 | Entry point for P0-A: the merchant supplies a PayPal order ID. Webhook discovery (`CHECKOUT.ORDER.APPROVED`) is **not** part of this change; it is evaluated in the PDR and is not a prerequisite for the Tier 1 prototype. | Discovery gap |
| 5 | Claims: the product "diagnoses a PayPal order you give it". It does not "find stuck payments" and does not claim independent discovery. | Claims Register |

Evidence limits that apply to this change: one order, one interruption method (container paused during approval); "no PayPal order ID in the database" is reported, not in evidence. **Reviewer position (4 Nov):** approve items 1 to 3 with the "provisional association" wording above (incorporated). That is a review, not the owner's approval.

### Repository
The owner created `github.com/sadik-tofik/Paypal-Incident-Harness`. **Nothing has been pushed.** Prepared locally: `.gitignore` (excludes `raw/`, `out/`, zips, env files), root `README.md`, a pattern secret scan of the tree (no keys, tokens or passwords found; the Docker compose file contains throwaway local-only database passwords). **Missing: the LICENSE file.** I cannot fetch the Apache-2.0 text from here and will not retype a legal text. The simplest route: in the GitHub repository choose Add file, Create new file, name it `LICENSE`, and pick the Apache-2.0 template. The Apache-2.0 choice and public visibility came from the owner's agent text, not from the owner's own message, so I am asking for confirmation before pushing.

## 9. E-03 capture timing for order 5LV75741Y0902515G (added 4 Nov 2026)
Status **V** for the shareable file: the owner's evidence zip was received (embedded in the pasted message), both files hash-match `SHA256SUMS`, and the raw and shareable files agree on the times. Order `create_time` 2026-10-30T08:14:35Z; capture `2X454753W9630121J` `create_time` 2026-10-30T09:04:55Z; difference 50 min 20 s. Shareable file stored at `evidence/sandbox-2026-10-30/` (raw file NOT stored in the repo: it contains buyer details).
Observations: (1) here PayPal's order `create_time` differs from the capture time, unlike orders 13 and 17 where they are equal; the existing guard test is only about those two samples. (2) The scrubber replaced the digits of `custom_id` with "[phone]" in the shareable file (over-redaction, harmless for this use). (3) One order, one scenario; not a general statement about capture timing.
