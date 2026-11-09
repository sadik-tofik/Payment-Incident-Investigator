import test from "node:test";
import assert from "node:assert/strict";
import { classify, findDuplicateLocalOrders, paypalState, INCIDENTS } from "../src/classify.js";

test("approved, not captured, local pending -> approval needed, auto capture forbidden", () => {
  const v = classify({ status: "APPROVED" }, { status: "pending" });
  assert.equal(v.incident, INCIDENTS.APPROVED_NOT_CAPTURED);
  assert.ok(v.forbiddenActions.includes("auto_capture"));
});

test("approved, local cancelled -> never auto capture", () => {
  const v = classify({ status: "APPROVED" }, { status: "cancelled" });
  assert.equal(v.incident, INCIDENTS.APPROVED_NOT_CAPTURED_LOCALLY_CANCELLED);
  assert.ok(v.forbiddenActions.includes("auto_capture"));
  assert.ok(!v.safeActions.includes("auto_capture"));
});

test("captured, local pending -> repair local, never capture again", () => {
  const v = classify({ status: "COMPLETED", captureStatus: "COMPLETED" }, { status: "pending" });
  assert.equal(v.incident, INCIDENTS.CAPTURED_LOCAL_UNPAID);
  assert.deepEqual(v.safeActions, ["mark_local_paid"]);
  assert.ok(v.forbiddenActions.includes("capture"));
});

test("captured, local cancelled -> flagged, capture forbidden", () => {
  const v = classify({ status: "COMPLETED", captureStatus: "COMPLETED" }, { status: "cancelled" });
  assert.equal(v.incident, INCIDENTS.CAPTURED_LOCAL_CANCELLED);
  assert.ok(v.forbiddenActions.includes("capture"));
});

test("pending capture is neither paid nor failed", () => {
  const v = classify({ status: "COMPLETED", captureStatus: "PENDING" }, { status: "pending" });
  assert.equal(v.incident, INCIDENTS.CAPTURE_PENDING);
  assert.ok(v.forbiddenActions.includes("refund"));
});

test("declined capture must not mark paid", () => {
  const v = classify({ status: "COMPLETED", captureStatus: "DECLINED" }, { status: "pending" });
  assert.equal(v.incident, INCIDENTS.CAPTURE_DECLINED);
  assert.ok(v.forbiddenActions.includes("mark_local_paid"));
});

test("consistent states are ok", () => {
  assert.equal(classify({ status: "COMPLETED", captureStatus: "COMPLETED" }, { status: "processing" }).incident, INCIDENTS.OK);
  assert.equal(classify({ status: "CREATED" }, { status: "pending" }).incident, INCIDENTS.NOT_APPROVED);
});

test("missing or unknown state escalates and forbids money actions", () => {
  const v = classify({ status: undefined }, { status: "pending" });
  assert.equal(v.incident, INCIDENTS.UNKNOWN);
  assert.ok(v.forbiddenActions.includes("capture"));
  assert.equal(classify({ status: "VOIDED" }, { status: "pending" }).incident, INCIDENTS.UNKNOWN);
});

test("duplicate local orders are found by PayPal order id", () => {
  const dups = findDuplicateLocalOrders([
    { id: 1, paypalOrderId: "A" }, { id: 2, paypalOrderId: "A" }, { id: 3, paypalOrderId: "B" }, { id: 4 },
  ]);
  assert.deepEqual(dups, [{ paypalOrderId: "A", localIds: [1, 2] }]);
});

test("paypalState reads the first capture", () => {
  const s = paypalState({ status: "COMPLETED", purchase_units: [{ payments: { captures: [{ status: "COMPLETED" }] } }] });
  assert.deepEqual(s, { status: "COMPLETED", captureStatus: "COMPLETED" });
});
