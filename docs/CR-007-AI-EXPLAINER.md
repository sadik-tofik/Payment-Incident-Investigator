# CR-007: optional AI explainer wrapper (APPROVED 8 Nov 21:02 local, owner message "approve CR-007"; items 1-6 as written)
(Owner message 10:27 local:)
Owner: "We have time so why not integrate a good amount of AI"; "U can use this gemini-3.8-flash or i have api key from nvidia".

| # | Item | Status |
|---|---|---|
| 1 | `app/src/modelClient.js` added: Gemini and NVIDIA (OpenAI-compatible) adapters behind the existing `explain()` validator (SRS SR-F-20..26, SR-I-30/31). **Off unless `AI_ENABLED=1`, provider, model id and key are all set.** Model id is never defaulted. | Built, 9 tests, **fake provider responses only; no live call has been made from this repository** |
| 2 | Scope stays the locked one: AI rephrases engine output only; it cannot decide a verdict, change evidence or trigger an action. A "good amount of AI" is **not** implemented as extra authority. The question-box idea needs a new API route and is **not built** (would need an API-contract change request). | Owner to decide whether to ask for it |
| 3 | Audit entries now record AI status, provider, model id, prompt version, latency and rejection problems (SR-F-26). Response shape unchanged. | Built |
| 4 | DR-8: the owner named `gemini-3.8-flash` (listed by Google's deprecations page, no shutdown announced, updated 22 Oct 2026) or an NVIDIA-hosted model (id not yet chosen). Earlier stated cap: $5 total. The code enforces a **per-process call budget (default 50), not a dollar cap**; a provider-side limit must be set by the owner. | Owner picks one provider and sets the limit when enabling |
| 5 | Data sent to the provider: statuses, amounts, currency, IDs, times and action names from the engine's structured output. No raw bodies, buyer names, emails or addresses (SR-F-20). The sandbox PayPal order ID is among the evidence values. | Disclosed in README |
| 6 | Proposed text changes to LOCKED documents (apply only on the owner's "approve CR-007"): API contract note 4 (aiStatus is `not_configured` only while AI is off); Evidence Spec C-06 proof column ("explanation is a template unless AI is switched on; AI text is validator-gated"). C-06 stays FORBIDDEN. | Proposed |

Applied 8 Nov: API contract note 4 and Evidence Spec C-06 proof column. **Not applied and not claimed:** the owner's 8 Nov 21:02 message contained the placeholder "[PASTE THE JSON OUTPUT FROM THE CURL COMMAND HERE]" instead of real output, so **no live model run is on record**; BR-07 stays at limited evidence.

Not changed: nothing here enables live mode, deployment or a push, and no key is stored in the repository.

IVM v1.0 rows changed as a consequence (generated file, status words only, no requirement change): BR-07, SR-F-21, SR-F-26, SR-I-30, SR-I-31, release-gate row "AI explainer adapter", finding D-10. TDD v0.3 and the README were updated for the same reason.

Owner decision 8 Nov 21:15 local: no live model call; AI explanations stay OFF by default and the submission uses templates. Devpost sentence D14 and video line V8 state that the adapter is tested only against simulated responses. Open risk, not mine to settle: PayPal's hackathon page says a project "must meaningfully use both PayPal and AI"; a templates-only submission may not satisfy that.
