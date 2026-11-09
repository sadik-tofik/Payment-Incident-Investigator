# Spike S0-A runbook: what does WooCommerce + the PayPal Payments plugin actually expose?

Status: instructions only. **I could not run any of this** (no Docker, no network to your site, sandbox hosts blocked). Every WooCommerce or plugin detail below marked *(unverified)* is my belief, not evidence. If a step differs on your screen, record the difference: that is a finding.

## The questions this spike answers (BRS A1, A2; SRS SR-F-06, SR-F-07, SR-I-20..22)
| # | Question | Where the answer appears |
|---|---|---|
| Q1 | Is the PayPal **order ID** readable from the WooCommerce REST API? Where (meta key, transaction_id, note)? | `summary.json` → `paypalOrderIdFoundAt` |
| Q2 | Is the PayPal **capture ID** readable? Where? | `captureIdsFoundAt` |
| Q3 | Which WooCommerce status does a successful PayPal payment end in? | `woo.status` |
| Q4 | Does the order carry a paid date (`date_paid_gmt`)? | `woo.date_paid_gmt` |
| Q5 | Are there timestamped order notes written by the plugin (history we could use later)? | `notes` |
| Q6 | How hard was it to set up (minutes, blockers)? | your own record |

## Part 1: environment (about 30 to 60 minutes; skip if you already have a WordPress site)
Do this on your own machine with **sandbox accounts only**. No real customer data, no live PayPal.

1. Run WordPress + WooCommerce locally. **Docker route (you offered it):** `cd s0a/docker && ./setup.sh`. It starts WordPress and MySQL on `127.0.0.1:8080`, installs WooCommerce and the PayPal Payments plugin, turns on pretty permalinks (needed for `/wp-json`), sets USD, adds a 10.00 product, and prints a throwaway admin password once. **I have not been able to run it**: if any command fails, send me the exact error. LocalWP is an alternative.
2. Install and activate **WooCommerce**, finish the setup wizard with a test store (currency USD to match our supported set).
3. Install and activate **WooCommerce PayPal Payments** *(plugin slug `woocommerce-paypal-payments`, unverified)*.
4. WooCommerce → Settings → Payments → PayPal: switch to **sandbox mode** and connect your **sandbox** business account. The plugin offers a connect flow, and I believe also manual entry of sandbox client ID and secret *(unverified)*. Note which one worked and how long it took. If the connect flow needs a public URL, tell me (that matters for webhooks, S0-B).
5. Add one cheap product (for example 10.00 USD).

## Part 2: one real order through checkout
1. As a shopper, buy the product and pay with a **sandbox buyer** account through PayPal. Complete the payment all the way back to the thank-you page.
2. Open WooCommerce → Orders and note the order number (call it `WC_ID`).
3. Copy the PayPal order ID. Try in this order: the order edit screen (transaction ID or notes), then the PayPal sandbox dashboard. Call it `PP_ID`. **Do not use order `5LV75741Y0902515G`** for this step: that order came from our harness, not from WooCommerce, so it cannot be linked to a store order.

## Part 3: create a read-only REST key
WooCommerce → Settings → Advanced → REST API → Add key → **Permissions: Read** *(unverified path)*. Copy the consumer key and secret **once**. Never use a Read/Write key for this spike.

## Part 4: run the capture script (read-only)
```bash
cd s0a
export WC_BASE_URL=http://localhost:8080        # your site; a subdirectory such as http://localhost:8080/wordpress is fine
export WC_KEY=ck_...   WC_SECRET=cs_...          # the READ key
export PAYPAL_CLIENT_ID=...  PAYPAL_SECRET=...   # SANDBOX app credentials
node capture.mjs --wc-order WC_ID --paypal-order PP_ID --out ./out
```
Rules for this step:
- Secrets stay in your shell. They are not printed, not saved, not needed by me. **Never paste them into any chat.**
- The script talks only to your WooCommerce URL and `api-m.sandbox.paypal.com`. It makes **one POST** (to the PayPal sandbox OAuth token endpoint, to obtain an access token). Every WooCommerce request and the PayPal order retrieval are **GET-only**. It never creates, captures, refunds or modifies anything, and it refuses a live PayPal host.
- Over `http://localhost` it signs WooCommerce requests with OAuth 1.0a, because I believe WooCommerce accepts REST keys by Basic auth only over HTTPS *(unverified; if you see HTTP 401, tell me, it is a finding)*. Over `https://` it uses Basic auth. Signed URLs are never saved.
- It writes `out/raw/` (unmodified responses, keep local) and `out/shareable/` (buyer blocks removed, emails/phones/tokens scrubbed, order notes kept because plugin IDs may live there).

**Send me everything in `out/shareable/`**, plus `out/SHA256SUMS`. Scrubbing is regex-based and not a guarantee: open the files and check them before sending. Sandbox buyer data is fake, but check anyway.

Also send me, as plain text: your WooCommerce, plugin and PHP versions; the setup time and any blockers (Q6).

## Part 5 (optional, only if Part 4 worked): what does a stuck order look like? (feeds S0-B)
Make a **second** sandbox order, but at the PayPal approval step approve the payment and then **close the tab before returning to the store** *(this is one way an approved-but-uncaptured state might arise; I do not know whether it does here)*. Wait a few minutes, then look at the order in WooCommerce and in PayPal and run the script again. Report exactly what each system says. Do not try anything involving live money.

## How the result changes the plan
| Outcome | Consequence |
|---|---|
| Q1 and Q2 yes, with stable meta keys | WooCommerceAdapter as designed; SR-F-06 and 07 get real field names; lock SRS v1.1 |
| Q1 yes, Q2 no | Match on order ID only; verdict rows needing the capture ID use PayPal's capture list; document the limit |
| Q1 no via REST, yes in notes | Match by parsing the note text; fragile; the claim must say so |
| Q1 no anywhere | Riskiest assumption A1 fails for the real store. PDR decision per BRS RK-2: reference store becomes the demo substrate, the product claim shrinks to "a diagnosis engine with a WooCommerce adapter prototype that could not link orders", and we say so plainly |
| Paid status differs from `processing`/`completed` | Update the normalization table; rerun tests |
| No `date_paid_gmt` and no timestamped notes | Divergence stays "observed at" (already the default) |

None of these outcomes is a failure of the process. A "no" is still a result, and it is cheaper to learn it today than on Nov 10.
