# CR-004 (revision 2): SRS §6.3 state fingerprint fields (APPROVED 4 Nov 2026, 14:16 local, owner's message "approve CR-004"; applied: SRS v1.3)
Raised by: reviewer findings on contract v0.4 and v0.5 (4 Nov 2026). Principle adopted: **every input that can alter identity, the verdict, or an approval-relevant decision must affect the fingerprint.**
Gap (verified): SRS §6.3 omits PayPal `custom_id`, `invoice_id`, purchase-unit data, plugin name/version and the identity state. A change to any would not move the fingerprint (SR-F-30, SR-F-32 rely on it).

## Change to §6.3 `decisionState`
Add: PayPal purchase-unit count; the full ordered list of purchase units, each with `custom_id`, `invoice_id`, amount, currency and its captures (id, status, amount, currency); the scalar `custom_id`, `invoice_id`, unit amount and currency; store plugin name and version; the count of PayPal order IDs the store holds; identity state and identity reason.

## Dependency check (I searched `engine.js`, `identity.js`, `fingerprint.js` for every field read from PayPal and store facts)
| Field read | In fingerprint? | Why |
|---|---|---|
| PayPal: orderStatus, captures (id/status/amount/currency), customId, invoiceId, purchaseUnitCount, unitAmount, unitCurrency, paypalOrderId | yes | decision or identity input |
| PayPal: units (per-unit view) | yes (new) | a change in any unit must be detected |
| Store: normalizedStatus, total, currency, localOrderId, paypalOrderIdRef, paypalOrderIdRefCount, pluginName, pluginVersion | yes | decision or identity input |
| Capture `createTime` | no | read only to build the optional `divergencePoint` statement while event time is disabled; no verdict, identity or action rule reads it |
| Store `rawStatus`, `statusHistory`, `statusHistoryComplete`, dates | no | evidence text or event-time path only (disabled) |
| `retrievedAt`, `rawSha256` | no | change on every read (kept excluded, SRS rationale unchanged) |
| `pluginVersionSource` | no | not read by any engine or identity code; output-only |
| `injected` flags | no | labelling only |
Rule: if an excluded field later becomes decision-relevant it must be added in the same change.

## Impact
SRS v1.2 to v1.3 (§6.3 only). Code implements it (build 0.6.3, `app/src/fingerprint.js`, `paypalClient.js`) with tests that change each field alone, including inside a second purchase unit. The fingerprint is returned in Tier 1 investigation responses but has **no approval-enforcement effect** until the gated approval features (Tier 2/3) exist. Until the owner approves, SRS text and code differ and this file records it.
Approval: given.
