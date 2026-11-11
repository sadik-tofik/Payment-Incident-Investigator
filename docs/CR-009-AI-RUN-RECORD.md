# CR-009: record the first real AI runs and change the sentences that said there were none

Status: APPROVED (11 Nov 2026).

Reason: on 11 Nov 2026 the optional AI layer ran against a real model (gemini-3.5-flash-lite) on orders 17 and 20 and the validator accepted both outputs. Three statements said no real run existed and are now untrue.

Changes (all wording only, no behaviour change except the items marked code):
1. `docs/DEVPOST.md` D14, `docs/VIDEO-SCRIPT.md` V8 and `docs/CLAIMS-TICKSHEET.md` rows D12, D14, V8.
2. `scripts/ivm.mjs` (then regenerate `docs/07-IVM.md`): BR-07 gate text, SR-F-21 note, D-10. BR-07 stays PARTIAL.
3. `docs/05c-UI-AGENT-PROMPT-v2.md` line 45.
4. New evidence file `docs/evidence/AI-RUN-2026-11-11.md`.
5. Code: `modelClient.js` prompt version expl-2 (digits only, evidenceIds on every statement), 2048 output tokens, 25 s timeout, cancelled calls reported as `timeout`; `explain.js` default timeout 25000 ms. The validator is unchanged. Build 0.8.6.

Not changed, needs a decision: `docs/06-EVIDENCE-SPEC.md` C-06 still says "no real model run is on record". It is a locked document. Edit it only under this CR once approved.

Open risks: two runs on one model; provider 503s; the AI text can omit parts of the result (order 20 omits the identity notice); the demo must show the label.
