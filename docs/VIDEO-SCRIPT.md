<!-- v0.2, 8 Nov. Placeholders resolved by the owner's decision to ship templates-only (no live model run). Now scanned as public text. Narration lines map to docs/CLAIMS-TICKSHEET.md. -->
# Video script (about 3 minutes)

On-screen rule: label REPLAY or INJECTED on every case, and show the limits text at the end.

**0:00** Merchants who take PayPal through WooCommerce can end up with two different stories about the same order: one in PayPal, one in the store.

**0:15** This is Payment Incident Investigator. You give it a PayPal order ID and it shows both systems side by side.

**0:30** This order was recorded from a real PayPal sandbox and a real WooCommerce store. PayPal says the buyer approved it, but no capture is recorded.

**0:50** The store does not hold the PayPal order ID, so the tool tells us the link is only a provisional association, and it shows why.

**1:10** Next to the verdict is every piece of evidence it used, and the suggestions a person could take, and the actions it forbids.

**1:30** Nothing here changes PayPal or the store. The only things written are local records of the investigation.

**1:45** Now an injected case. We created this one ourselves: a capture whose amount differs from the store total. The screen labels it injected.

**2:10** Optional AI explanations are off unless a key is configured; for this clip we switched them on for order 20, and the model's wording is shown under a label after passing the validator.

**2:30** What it does not do: it does not fix orders or move money, it has only seen sandbox data from one setup, and no merchant has tested it.

**2:50** Everything shown here can be re-run from stored evidence, and the repository lists exactly what is proven and what is not.

