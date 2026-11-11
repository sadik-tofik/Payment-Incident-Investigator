# Payment Incident Investigator (working title)

Hackathon project for the PayPal AI Hackathon. Status: **work in progress, local prototype**. Nothing here is a claim of production readiness, security, diagnostic accuracy, or WooCommerce compatibility beyond what the evidence folders show.

Given a PayPal order ID, a deterministic engine reads PayPal's order state and the associated WooCommerce order, shows both, says whether it can link them (confirmed, provisional association, or unresolved), reports where they disagree (or abstains), and lists permitted human-only suggestions and forbidden actions. A person decides and acts elsewhere. Sandbox only. No money-moving or store-writing code exists in this repository.

**"Read-only" here means read-only with respect to PayPal and WooCommerce:** no payment or order write, and no action executes. `POST /investigations` does create a local investigation record, an audit entry and, when configured, an evidence bundle file.

## Run it (Node 20+, no dependencies)

```
cd app && npm test        # 90 tests, offline
cd app && npm run serve   # API on http://127.0.0.1:8787/api/v1
```
Set `UI_ORIGIN=http://localhost:5173` (your UI's origin) to allow browser calls. Try it:
```
curl http://127.0.0.1:8787/api/v1/cases
curl -X POST http://127.0.0.1:8787/api/v1/investigations -H 'content-type: application/json' -d '{"mode":"replay","caseId":"replay-order-20"}'
```
Modes: `replay` (3 recorded sandbox orders in `app/data/replay/`) and `injected` (3 synthetic cases). every `mode: live` request returns 403 `mode_not_enabled` in this build. Outputs land in `app/out/` (audit log, bundles). **Optional AI explanations (off unless all of these are set):** `AI_ENABLED=1 AI_PROVIDER=gemini|nvidia AI_MODEL=<model id> GEMINI_API_KEY=… (or NVIDIA_API_KEY=…) AI_MAX_CALLS=50 npm run serve`. Keys live only in your environment; do not commit or paste them. When on, the investigation's evidence values (statuses, amounts, IDs, times; no buyer fields) are sent to that provider. `AI_MAX_CALLS` is a local safeguard per server process, not a dollar cap; set a spending limit in the provider account as well. Any model error, timeout or rejected output falls back to the template.

**Web interface:** start the server with `UI_ORIGIN=http://localhost:5173 node scripts/serve.mjs 8787` (without `UI_ORIGIN` the browser blocks the UI's calls). In a second terminal, `cd ui && npm ci && npm run dev`, then open the address it prints. By default it calls the server on port 8787. With `VITE_USE_MOCK=1` it shows the saved example responses instead and says so on every page. `npm run build` runs the claims audit first and fails on any finding.

Verify a bundle offline: `node scripts/reproduce.mjs <bundle>`. This shows the decision follows from the stored inputs, not that the inputs matched PayPal or WooCommerce.

## Fixtures
`docs/ui-fixtures/` holds 17 saved API responses (generated from the real server by `scripts/gen-ui-fixtures.mjs`; a test checks they still match). They cover the tested scenarios only, not the whole contract. The API contract is `docs/05a-API-CONTRACT.md`.

## Demo Honesty Ledger
| What you see | What it really is |
|---|---|
| `replay` cases | Recordings of 3 real sandbox orders from one local WooCommerce setup (WooCommerce 11.2.1, PayPal Payments plugin 4.2.0). PayPal and store were read at different times. |
| `injected` cases (INJECTED0001-3) | **Synthetic.** Written by us to exercise rules. The "captured on PayPal, unpaid in the store" case has not been observed in a real store. |
| Order 20 identity | **Provisional association** inferred from PayPal-side identifiers; the store did not hold the PayPal order ID. |
| Verdicts | Decision-table rows matched, not proven diagnoses. Tests show the engine returns the labels we wrote (fixture parity); they do not measure accuracy. No merchant has validated that this solves a real problem. |
| Explanations | Fixed templates by default. **AI explanations are off by default.** When switched on by the operator, a model only rephrases the engine's result; every sentence must cite engine evidence IDs and pass a validator, otherwise the template is shown. The validator is a guard on IDs, values and wording, not a proof that a sentence is true. The model does not decide the verdict or any action. Not yet run against a real model provider in this repository. |
| Event time | Disabled. Only when the disagreement was *observed* is reported, not when it began. |
| Audit log | Detects inconsistent edits, deletions and reorders; a full consistent rewrite is not detected. No multi-process locking or crash recovery. |
| Redaction | Best effort, not a privacy guarantee. |

## How PayPal and AI are used
**PayPal.** The PayPal Orders v2 API in the free sandbox. The reader class is GET-only with an allow-list and has no write method. We used it to record three real sandbox orders, kept in `evidence/`; replay mode re-reads those recordings. Live mode is not wired in this build: the HTTP API answers 403 for any live request. We also ran one sandbox test of PayPal-Request-Id behaviour (`evidence/`, claim C-03, one run).

**WooCommerce.** The WooCommerce REST API with the PayPal Payments plugin 4.2.0, one local store, used to record the store side of those orders.

**AI.** An optional layer that sends the engine's structured result to a Gemini model (`gemini-3.5-flash-lite` in our runs) and asks it to rephrase it in plain English. It is off unless the operator sets the environment variables below. The model does not decide the verdict or any action. Every sentence it writes must cite evidence IDs the engine produced and pass a validator; otherwise the fixed template is shown. In our log, 4 of 14 attempts were accepted and the others fell back to the template (rejected output, provider errors, timeouts or malformed output). See `docs/evidence/AI-RUN-2026-11-11.md`. This is a small record, not an evaluation.

## Layout
- `docs/`: BRS, SRS, Threat Model, PDR, API contract, Evidence Spec, IVM, change requests. Start with `docs/00-INDEX.md`. `docs/07-IVM.md` is the requirement-to-test map and lists what is **not** implemented.
- `app/`: engine, identity, orchestrator, HTTP server, replay data, tests.
- `ui/`: the web interface (Vite, React, TypeScript; no component kit, no third-party requests). Design notes in `ui/DESIGN-NOTES.md`; the design specification is `docs/05c-UI-AGENT-PROMPT-v2.md`.
- `scripts/`: server, fixture generator, reproduce, IVM generator, pre-push scanner.
- `evidence/`: scrubbed sandbox captures with SHA-256 sums (integrity only, not source authentication). Raw captures are not committed.
- `s0a/`, `harness/`: earlier spike and experiment scripts.

**License:** Apache-2.0 (see `LICENSE`).
**Not done / not claimed:** live mode, any live AI-provider run in this repository, approval or write actions, public deployment, claims-audit script, merchant validation.
