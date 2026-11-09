# CR-006: Tier 1 as final hackathon scope; model choice; IVM rows (owner message, Sat 7 Nov 08:22 local)

| # | Decision | Source | Effect |
|---|---|---|---|
| 1 | **Tier 1 diagnosis, with no PayPal payment-state or WooCommerce order-state write path, is the final hackathon scope.** (Wording corrected 8 Nov on the reviewer's note: the app does write local investigation records, audit entries and bundle files.) Tier 2 (store write) and Tier 3 (PayPal capture) stay gated and are **not** part of the submission. | Owner: "We are shipping Tier 1. Lock Tier 1 as the final hackathon scope and keep Tier 2 and Tier 3 gated." | Satisfies the BRS hard rule (cut Tier 2/3 if not built and tested by Sun 8 Nov). BR-06, BR-09 integration, SR-F-30..37 stay NOT IMPLEMENTED in the IVM and are out of the submission. BRS §7.3 floor unchanged. |
| 2 | Model wrapper stays **disabled by default**; templates are the explanation. If ever wired as an option the owner asked for `gemini-2.0-flash`. | Owner message | **That model cannot be used.** Google's deprecations page (updated 22 Oct 2026) lists gemini-2.0-flash with a shutdown date of **1 June 2026**, replacement gemini-3.6-flash; gemini-3.6-flash and gemini-3.8-flash have no announced shutdown. DR-8 is therefore still **not approved**: the owner must name a currently available model and confirm the $5 cap. Nothing is wired; no call has been made. |
| 3 | LICENSE (Apache-2.0) is on `main` of the owner's repository. | Owner statement | Recorded as **reported**. It is not in this working tree and I cannot see the repository. README says to confirm before publishing. |
| 4 | IVM v1.0 rows BR-12 and SR-F-62 updated now that `scripts/claims-audit.mjs` exists (BR-12 PARTIAL, SR-F-62 IMPLEMENTED + TESTED). Pre-push script now runs the audit and states when Git history was not scanned. | Owner request to build the audit | IVM is generated; the change is in `scripts/ivm.mjs`. Not a requirement change. |

Reviewer note (8 Nov): CR-006 was not in the files the reviewer received; it is re-sent with TDD v0.2.

Not changed: nothing here enables live mode, a model call, deployment or a push.
Approval: the three decisions are the owner's own words above; item 4 is a consequence of building the script he asked for.
