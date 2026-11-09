> **Update 9 Nov:** the visual design, all page copy and the full state list are in `05c-UI-AGENT-PROMPT-v2.md`. This file's behavioural rules, screens and acceptance checklist remain in force.

# 06 · UI-agent prompt (v1.0, written against API Contract v1.0 LOCKED, PDR v1.0 LOCKED)

Give the whole file to the frontend agent, together with `docs/05a-API-CONTRACT.md` and the folder `docs/ui-fixtures/`.

---

## What you are building
A small web UI for the **Payment Incident Investigator** (PayPal AI Hackathon entry). One sentence, which must be the first thing a visitor reads:

> **Give it a PayPal order ID. It reads that order from PayPal and the matching order from WooCommerce, shows what each system says, says whether it can link them and where they disagree (or that it cannot tell), and lists which next steps are safe and which are forbidden. It changes nothing.**

It is a **diagnosis tool that is read-only with respect to PayPal and WooCommerce** (it creates local investigation records only). It never executes anything. A person decides and acts elsewhere.

## Ground rules (non-negotiable)
1. Build only against the **locked API contract** (`05a-API-CONTRACT.md`). Do not invent fields, routes or states. If something is missing, write it down as a question; do not fill the gap.
2. **No control anywhere that looks like it executes something**: no approve, capture, mark-paid, refund, retry, repair, edit, "fix it" button. No stuck-order lists, no search across orders, no accounts or login, no webhook screens.
3. `actions.safe[]` entries are **suggestions for a person** (`humanActionOnly: true`). Never render them as buttons or as "approved/authorised/done". Render them as plain text under "Suggested next step (a person decides)".
4. Strings that come from the API (`finding`, `explanation.*`, `reason`, `label`, `limits`, `requiredNotice`) are shown **verbatim**. Do not reword, summarise, soften or strengthen them.
5. Your own UI copy must avoid these words: guarantee(s/d), prevent(s/ed), root cause, caused by, eliminate(s/d), zero, always, never, fully, instantly, autonomous(ly), production-ready. Do not call anything "AI-powered", "automatic" or "real-time". Do not claim accuracy, savings or customer demand.
6. Until the HTTP routes exist, develop against `docs/ui-fixtures/*.json` through a thin client module with one function per route, so swapping the mock for the real server changes one file. Each fixture is `{ "httpStatus", "body" }`.
7. Public demo = `replay` and `injected` only. Do not build a "live" mode switch that appears when credentials are missing. Show live only if `GET /health` lists it in `modesAvailable`.

## Screens
**A. Start screen.** The one-sentence promise above. A list of ready-made cases from `GET /cases` (replay cases first, injected after, each with its source label). A single text field "PayPal order ID" with a Start button (uses `POST /investigations`, mode chosen from the case or `replay`/`live` as available). Under the field: "Where do I find the ID? In the PayPal transaction details, or in the WooCommerce order page when the store holds it. Some stuck orders do not have it in the store; then you need PayPal's copy." Show client-side only a format hint; the server validates.

**B. Investigation screen** (`200`). Top to bottom:
1. **Source badge**, always visible: `source.label` (recorded real sandbox capture / live sandbox / injected (not a real merchant incident)). Injected must look clearly different from real captures.
2. **Verdict card** with `decision.verdict` in plain language, `decisionStatus`, and `decision.reason`. `abstain` and `unknown` are **findings, not errors**: neutral styling, no red, no "failed", never green. Show `decision.finding` when present.
3. **Identity block** next to the verdict: `identity.state` as "Confirmed (both systems name each other)", "Provisional association" or "Unresolved". For provisional, show `identity.requiredNotice` in full, in the visible area, never in a tooltip. For unresolved, show `identity.reason` and, if `needs.paypalOrderId` is true, a prompt to paste the PayPal order ID (which starts a new investigation).
4. **Two systems side by side** (`systems.paypal`, `systems.store`): status, amount and currency, `retrievedAt`, captures list. Label times "observed at", never "happened at" (`timeKind` is always `observed`). If a system is `null` show "Not read", never an empty or zero state. Show `store.holdsPayPalOrderId` as "Store holds the PayPal order ID: yes/no". Show `pluginVersion` with the words "declared by the operator".
5. **Explanation** (`explanation.statements[]`): each statement followed by its evidence chips (`evidenceIds`); clicking a chip opens that evidence item from `evidence[]` (source, field, value, observedAt, `rawHash`). Show a small tag "Template" or "AI (validated)" from `explanation.kind`; if `aiRejected`, say the AI text was replaced by the template. `aiStatus: "not_configured"` is normal; do not show it as a problem.
6. **Next steps**: "Suggested next step (a person decides)" from `actions.safe`; "Not allowed here" from `actions.forbidden`, each with its `reason` and `rule`. If the same list appears for every case that is expected.
7. **Limits** (`limits[]`) as a visible "What this result does not tell you" panel, not a footnote.
8. **Integrity** (`integrity`): wherever you show a hash, call it "stored copy hash" and show the note that it does not prove PayPal or the store said it. Never use the words "verified", "authentic", "tamper-proof" for hashes or for the audit log.
9. Footer: `stateFingerprint` (shown as "state fingerprint: identifies the facts this result used") and `auditId`.

**C. Error screen** (non-200). Use `error.code` to choose copy, show `error.message` verbatim, and show `partial` (system, reason, retrievedAt) when present. **Never show a verdict for an error response**, and never style an upstream failure like a finding. Specific cases: `400` fix your input; `403 mode_not_enabled` this mode is not available here; `404 paypal_order_not_found` / `store_order_not_found` "that system says no such order"; `502 upstream_auth_rejected` "the operator's credential was rejected; nothing was retried" (do not suggest the user fix it); `502 upstream_unreachable` / `upstream_bad_response` "could not read X"; `504 deadline_exceeded` "took too long; nothing was concluded".

**D. Audit page** (optional, low priority): `GET /audit/verify` result described only as "chain consistency check; does not prove the data was genuine or that the file could not be rewritten".

## Accessibility and layout
Color is never the only signal (icon plus text). Keyboard reachable, visible focus, labels on inputs, sensible heading order, contrast at least WCAG AA, works at 360 px width, light and dark themes. Plain, calm, sober visual style appropriate to a payments tool. No stock imagery, no gradients as decoration, no animated "AI" effects.

## Acceptance checklist (the owner will check each by looking)
- [ ] Promise sentence is the first thing on the start screen.
- [ ] Source badge visible on every investigation; injected is unmistakable.
- [ ] `confirmed`, `provisional_association`, `unresolved` look different; provisional shows the full notice in the open.
- [ ] `unknown`/`abstain` never red, never green, never labelled an error.
- [ ] Both systems side by side with observed-at times; null shown as "Not read".
- [ ] Every explanation statement has clickable evidence; evidence shows the stored-copy hash note.
- [ ] Forbidden actions listed with reasons; no executable-looking control exists anywhere.
- [ ] Error responses never show a verdict.
- [ ] No word from the forbidden list in your own copy (run a script over the built strings and show the result).
- [ ] Every fixture in `docs/ui-fixtures/` renders without console errors; a screenshot for each is delivered.

## Fixtures
Real HTTP responses from the built server (`app/src/server.js`; regenerate with `node scripts/gen-ui-fixtures.mjs`; a test fails if they drift): `investigation-confirmed-ok`, `investigation-provisional-approved-not-captured` (real recorded order 20), `investigation-unresolved-needs-paypal-id`, `investigation-abstain-link-unresolved` (a PayPal order and a store order that do not name each other), `investigation-injected-captured-local-unpaid`, `-amount-mismatch`, `-multiple-captures`, `error-400-invalid-order-id`, `error-400-case-combined-with-order-id`, `error-403-live-not-enabled`, `error-404-paypal-order-not-found`, `error-404-store-order-not-found`, `error-502-upstream-unreachable`, `error-502-upstream-auth-rejected`, `error-504-deadline-exceeded`, `cases`, `health`. `id`, `auditId`, `createdAt` and `retrievedAt` in errors are placeholders. The server also answers `404 not_found` (unknown route) and `405 method_not_allowed`; treat both as a generic "could not complete the request" message.

Run the real server locally with `node scripts/serve.mjs 8787` (set `UI_ORIGIN=http://localhost:5173` for CORS). It serves replay and injected only.

## Questions to return to the owner instead of guessing
Anything not in the contract; any copy you are unsure is allowed; any state a fixture does not cover.


## Addendum 8 Nov (CR-007): AI explanations
`explanation.kind` is `ai_validated` only when a model's text passed the server-side validator; otherwise `template`. Handle every `aiStatus` (`not_configured`, `accepted`, `rejected`, `timeout`, `error`). Label `ai_validated` text "AI-rephrased from the evidence (checked against it, not guaranteed true)"; show the evidence chips as usual. When `aiRejected` is true show a quiet note that the AI text was rejected and the standard explanation is shown. The AI never changes the verdict, the evidence or the actions, and the UI must not present it as the diagnosis. Response shapes are unchanged.
