<!-- v0.2, 8 Nov. Placeholders resolved by the owner's decision to ship templates-only (no live model run). Now scanned as public text. Sentence numbers map to docs/CLAIMS-TICKSHEET.md. -->
# Payment Incident Investigator

*Working title. Status: prototype, sandbox only.*

## What it is
Payment Incident Investigator is a diagnosis tool for WooCommerce stores that take PayPal payments. You give it a PayPal order ID. It reads that order from PayPal and the matching WooCommerce order, shows both side by side, and says whether it can link them. When the two systems disagree it reports what it observed and when it observed it; when the evidence is not enough it says so and abstains. It lists suggestions only a person can act on, and actions it forbids. It changes nothing in PayPal or WooCommerce, and no route in its API executes anything; the app does create local records of each investigation.

## What we actually observed
We ran three real PayPal sandbox orders through a local WooCommerce 11.2.1 store with the PayPal Payments plugin 4.2.0 and recorded the results. One of those orders was approved on PayPal with no capture recorded, and the store did not hold the PayPal order ID, so the tool labels the link between the two as a provisional association rather than a confirmed match. In a separate sandbox run, PayPal created a capture about 50 minutes after the order was created. That is one order, not a typical delay. The other cases in the demo, such as a capture whose amount differs from the store total, are injected by us and are labelled as injected on screen.

## How it works
A fixed decision table of 14 rules, checked in order, picks the verdict. Evidence items back every statement, and the same stored inputs give the same verdict when re-run offline. Every investigation is written to a hash-chained audit log that detects edited, removed or reordered entries. It does not detect someone rewriting the whole file. The tool is built in Node.js with no runtime dependencies, and has 107 automated tests. The tests show how the code behaves on our cases; they do not measure diagnostic accuracy.

## The AI part
An optional AI layer can rewrite the engine's result in plain English using Gemini or an NVIDIA-hosted model. It is off by default. Every sentence it writes must cite evidence the engine produced and pass a validator; if it does not, the fixed template is shown instead. The AI does not decide the verdict or any action. The AI layer has been tested only against simulated provider responses; no real model has been run, and the demo shown here uses the fixed templates.

## What it does not do
It does not fix orders, move money, or capture payments. Those features are designed but not built and are not part of this submission. It does not discover problem orders on its own; the merchant supplies the PayPal order ID. It has only seen PayPal's sandbox and one plugin version in one store setup, so it says nothing about other setups. Its two reads are not simultaneous, redaction is best effort, and it does not know when a disagreement began, only when it saw it. We have not tested it with any merchant, so we cannot say how often its verdicts are right or whether merchants need it.

## Built with
Node.js, PayPal Orders v2 (sandbox), WooCommerce REST API with the PayPal Payments plugin 4.2.0, Gemini or an NVIDIA-hosted model for the optional explanation layer.
