# 05 · Technical Design Document (TDD), short

| Field | Value |
|---|---|
| Version | **1.0 LOCKED** (Sun 8 Nov 2026; owner message "approve TDD", 21:02 local, given for v0.3 which adds the model adapter per CR-007). History: v0.1 7 Nov; v0.2 8 Nov (reviewer-approved wording); v0.3 8 Nov. Changes need a change request. Approval is of the document, not of deployment readiness. |
| Describes | Build 0.8.0 as it exists (sections 1-7). Section 8 lists work that does **not** exist yet and is kept separate. The document adds no requirements. |
| Scope | **Tier 1 only** (CR-006). Tier 2/3 have no design here: they are not built and not in the submission. |
| Derived from | BRS v1.2, SRS v1.4, Threat Model v1.0, PDR v1.0, API contract v1.0, Evidence Spec v1.0, IVM v1.0 |

**Boundary used throughout (read-only scope).** "Read-only" means *no mutation of PayPal payment state or WooCommerce order state, and no action executes*. It does **not** mean the system writes nothing: `POST /investigations` creates a local investigation record (in memory), an audit entry and, if configured, an evidence bundle file. The server therefore must not add any route or client method that writes to PayPal or WooCommerce.

## 1. Shape (implemented)
Node 20+, ESM, **no runtime dependencies**. One process: an HTTP server (`app/src/server.js`) calling a pure-ish orchestrator, which calls two reader interfaces, a deterministic engine, an explanation step and an audit log. The UI is a separate project (built by the owner's frontend agent) that talks only to `/api/v1`.

```
UI --HTTP--> server.js --> orchestrator.investigate()
                              |-- sources: replay | injected | (live: not wired)
                              |     paypal.getOrder(id)      -> PayPal facts   (paypalClient.js | recorded)
                              |     store.getOrderByLocalId  -> store facts    (wooClient.js GET only | recorded)
                              |-- identity.resolveIdentity() -> confirmed | provisional | unresolved
                              |-- engine.diagnose()          -> verdict, rule row, evidence, safe/forbidden actions, fingerprint
                              |-- explain()                  -> template text; optional AI rephrase (off by default, validator-guarded)
                              |-- audit.append()             -> hash-chained JSONL
                              `-- evidence bundle write      -> bundles/<id>.json (re-runnable offline)
```

## 2. Modules
| Module | Responsibility | Must not |
|---|---|---|
| `paypalClient.js` | GET order, map to facts (per purchase unit, captures), 404 `RESOURCE_NOT_FOUND` handling, redaction of raw copy | any non-GET call |
| `wooClient.js` | GET only; HTTPS (or localhost) OAuth1; no redirects; id `^\d{1,12}$` | write, follow redirects |
| `replay.js`, `injected.js` | recorded real cases (3) and labelled synthetic cases (3) behind the same reader interface | pretend to be live |
| `identity.js` | store facts from a Woo order, `_ppcp_paypal_order_id` key, plugin version check, `resolveIdentity` | treat provisional as confirmed |
| `engine.js` | 14-row first-match decision table; `decisionStatus` `rule_matched`/`abstain`; safe and forbidden actions; evidence list | call a network, use a model, output a confidence |
| `normalize.js`, `canonical.js`, `fingerprint.js` | integer minor units, canonical JSON, state fingerprint (CR-004) | sum multiple captures |
| `explain.js` | deterministic template per verdict (the only explanation produced in this build); validator (evidence IDs, avoid-list, value tokens); an optional `explainFn` hook. In this build the hook is fed by `modelClient.js` only when the operator sets `AI_ENABLED=1` (default off, so `aiStatus` is `not_configured`). | trust model text |
| `redact.js` | best-effort key/pattern redaction | claim privacy guarantees |
| `audit.js` | append-only hash chain, `verify()` | claim tamper-proof |
| `orchestrator.js` | input validation, deadline (30 s), assembling the response, bundle, audit entry, error mapping | execute any action |
| `server.js` | routes, status codes, body limits, CORS allow-list, optional rate limit, in-memory investigation store | add a route that writes to PayPal or WooCommerce |
| `modelClient.js` | optional provider adapter (Gemini or NVIDIA OpenAI-compatible): fixed provider host, key from env only, JSON output, temperature 0, no tools, call budget, timeout; records model id and prompt version in the audit entry | see any credential other than its own provider key; get anything but `buildModelInput` output; decide verdicts or actions |
| `requestJournal.js` | reference implementation of request-ID journaling | be presented as product capability (not integrated) |

## 3. Data model
- **Facts in:** PayPal facts (`status`, purchase units, captures, `custom_id`, `invoice_id`, retrieval time) and store facts (normalized status, total, currency, PayPal-ID ref and count, plugin name/version and its source). Raw responses are **redacted before hashing and storage** (SRS v1.4 SR-F-02).
- **Investigation (response):** `id`, `source{mode,label}`, `identity{state,basis}`, `systems`, `decision{decisionStatus,verdict,ruleRow,reason,finding,...}`, `evidence[]` (id, source, field, value, observedAt), `actions{safe[],forbidden[]}` (`humanActionOnly: true`), `integrity` (hash spec + hashes), `explanation{kind,text,statements}`, `limits`, `auditId`. Full shape: `docs/05a-API-CONTRACT.md`; 17 saved examples in `docs/ui-fixtures/`.
- **Evidence bundle** (`evidence-bundle-1`): exactly what the engine consumed plus `expected` outputs. `scripts/reproduce.mjs` re-runs the engine and requires verdict, rule row, reason, decisionStatus, fingerprint and evidence to be present and equal. It shows the decision follows from the stored inputs, not that the inputs matched PayPal or WooCommerce.
- **Audit entry:** `{seq, type, data, prevHash, hash}` (`data` includes, for investigations, an `ai` record: status, model id, prompt version, latency).

## 4. Sequence (POST /investigations)
1. Validate body (`mode`, `caseId` exclusive and mode-bound, ID patterns, 16 KB limit). `live` is refused 403 `mode_not_enabled`.
2. Start the 30 s deadline.
3. Resolve entry: PayPal order ID (primary) or local order number (secondary; without a stored PayPal ID the result is *unresolved* and asks for the PayPal ID).
4. Read PayPal, then the store (two reads, **not atomic**; each carries its own retrieval time).
5. Resolve identity; run the engine; build the explanation (template, or AI text if enabled and it passes the validator).
6. Hash redacted inputs, build the response, write the bundle if configured, append the audit entry.
7. Return 200 for any completed investigation, including abstain.

## 5. Failure handling
| Failure | Result |
|---|---|
| Bad input | 400 `invalid_body` / `invalid_order_id` |
| Live mode | 403 `mode_not_enabled` |
| PayPal `RESOURCE_NOT_FOUND` body | 404 `paypal_order_not_found` (only on PayPal's own body) |
| Store order missing | 404 `store_order_not_found` |
| Upstream auth, network, unreadable | 502 with `partial` and `auditId` |
| Deadline | 504 `deadline_exceeded` |
| Unknown plugin version | a finding in the result, not an error |
| Model off, errored, timed out, over budget, or output rejected | template text; `aiStatus` `not_configured` / `error` / `timeout` / `rejected` (`aiRejected: true`). Tested with fake providers only; no live provider run yet |
| Oversized body | >16 KB: 400 after draining; >1 MB: connection cut |
| Rate limit (if enabled) | 429 |

## 6. Security design (from the Threat Model)
Sandbox only; GET-only readers with an allow-list; no write method exists on any reader class; no action route; `humanActionOnly` on every suggestion; secrets only in environment and never logged; redaction before storage; fixed templates; CORS allow-list; id patterns reject path and query injection. The pre-push script scans for secrets and runs the claims audit.

## 7. Known limits and deployment blockers (carried from the IVM; not fixed here)
- Audit: no multi-process locking or crash recovery; a consistent full rewrite is undetected.
- Investigations are held in memory and lost on restart; bundles and audit files are unbounded.
- Rate limiter has two overlapping bounds (inline prune and sweep); not complete protection.
- Event time disabled; reads non-atomic; redaction best effort.
- Evidence is 3 real orders from one setup (WooCommerce 11.2.1, plugin 4.2.0); one interruption method; P0-B only injected. This is narrow observation, not validation of diagnostic accuracy and not merchant-level validation.
- Live mode is not built. The model adapter exists but has been tested only against fake provider responses. `gemini-2.0-flash` is past Google's 1 June 2026 shutdown date (CR-006); the owner named `gemini-3.8-flash` or an NVIDIA-hosted model on 8 Nov (CR-007). The call budget is not a dollar cap.

## 8. NOT IMPLEMENTED: remaining work before submission (future, kept separate from sections 1-7)
| Item | Owner | Note |
|---|---|---|
| UI built from `05c-UI-AGENT-PROMPT-v2.md` against the fixtures | owner's frontend agent | a first build exists in `ui/` (CR-008); acceptance evidence (screenshots, axe report, network check) is not yet in the repository |
| Devpost text and video script, then claims audit and a human tick-through | owner + me | put them at `docs/DEVPOST.md` and `docs/VIDEO-SCRIPT.md` (public text; the audit scans them) |
| Timed demo rehearsal | owner | BR-16 stays NOT IMPLEMENTED until done |
| Clean-clone run following the README | owner | SR-N-03 |
| Confirm LICENSE on `main`; run the pre-push script on the real Git tree | owner | history scan only works inside Git |
| One real provider run with the owner's key, output kept as evidence | owner | no live model run exists yet |
