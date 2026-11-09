# PayPal incident harness (sandbox validation)

Answers one question before we build the app: **can we reproduce and safely classify the three P0 payment incidents against the real PayPal sandbox?**

Zero dependencies. Node 20+.

## Setup (5 minutes)

1. developer.paypal.com > Apps & Credentials > **Sandbox** > create an app. Copy the client id and secret.
2. In Sandbox > Accounts, note a **personal (buyer)** test account's email and password.
3. Export credentials:

```bash
export PAYPAL_CLIENT_ID=...
export PAYPAL_CLIENT_SECRET=...
```

The client refuses to talk to any host that is not the PayPal sandbox.

## Run

```bash
npm test                      # 10 unit tests for the incident classifier (offline)
node run.js 3                 # lost create response (no human step)
node run.js 2                 # captured, local says unpaid
node run.js 1 --probes 0,5,30,75   # approved, never captured, merchant cancels; probe over 75 minutes
node run.js all --mock        # offline logic check against a local mock (proves nothing about PayPal)
```

Scenarios 1 and 2 print an approval link. Open it, log in as the sandbox buyer, approve, and press Enter. Do **not** capture in the browser.

Each run writes `results/<timestamp>.json` with every API call, status and `paypal-debug-id`.

## What each scenario answers

| # | Question | Result you want to look at |
|---|---|---|
| 1 | After approval, with the merchant order cancelled, is the PayPal order still capturable after 0/5/30/75 min? | `evidence.captureAfterDelay` and `evidence.probes` |
| 2 | After capture, can we classify "PayPal paid, merchant unpaid" and avoid a second capture? | `evidence.retrySameKey`, `evidence.retryNewKey`, no second capture id |
| 3 | If a create response is lost, does retrying with the same `PayPal-Request-Id` return the original order? Does a new key create a duplicate? | `evidence.retrySame` vs `evidence.retryNewKey` |

`pass: true` means the question was answered cleanly. Read `findings`: for scenario 1 the capture-after-delay outcome is the real result, whichever way it goes.

## Not covered yet

- Webhook delivery failures and duplicates (needs a public URL, use ngrok plus the PayPal webhook simulator).
- The WooCommerce adapter (status read via REST).
- Anything LLM-related. `src/classify.js` is deterministic by design; the AI layer later explains its verdicts and never decides whether money moves.

## Known assumptions to confirm from real output

- Idempotent create with `PayPal-Request-Id` (PayPal documents retention for a long window; confirm in scenario 3).
- Approved orders remain capturable for some period (the unknown scenario 1 measures).
- `ORDER_ALREADY_CAPTURED` is returned on a second capture (scenario 2).
