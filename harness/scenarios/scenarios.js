// The three P0 scenarios. Each returns { name, pass, findings, evidence }.
// "pass" means the question we are validating was answered, not that PayPal behaved a given way:
// the findings record what PayPal actually did, which is the point of the harness.
import { approvalLink, captureOf } from "../src/paypal.js";
import { classify, paypalState } from "../src/classify.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Scenario 1: approved, never captured, merchant cancels locally. Is capture still possible later? */
export async function scenario1({ pp, io, probeMinutes = [0, 5], mock = false }) {
  const ref = `inc1-${Date.now()}`;
  const evidence = { probes: [], calls: [] };
  const created = await pp.createOrder({ referenceId: ref, requestId: pp.newRequestId() });
  if (!created.ok) return fail("scenario1", "create order failed", created);
  const orderId = created.json.id;
  const link = approvalLink(created.json);
  evidence.orderId = orderId;
  evidence.approvalLink = link;

  await io.humanStep(
    `Open this link, log in as a SANDBOX BUYER, and approve (do NOT capture):\n  ${link}`,
    () => mock && pp.mockApprove(orderId),
  );

  const t0 = Date.now();
  for (const minutes of probeMinutes) {
    const wait = t0 + minutes * 60_000 - Date.now();
    if (wait > 0 && !mock) { io.say(`waiting ${Math.ceil(wait / 60000)} min before next probe...`); await sleep(wait); }
    const got = await pp.getOrder(orderId);
    const state = paypalState(got.json);
    const verdict = classify(state, { status: "cancelled" }); // merchant cancelled locally
    evidence.probes.push({ minutesAfterApproval: minutes, httpStatus: got.status, state, incident: verdict.incident, forbidden: verdict.forbiddenActions });
  }

  // Experiment only: does capture still work after local cancellation and delay? (sandbox money)
  const cap = await pp.captureOrder(orderId, pp.newRequestId());
  evidence.captureAfterDelay = {
    httpStatus: cap.status,
    orderStatus: cap.json?.status ?? null,
    errorName: cap.json?.name ?? null,
    issue: cap.json?.details?.[0]?.issue ?? null,
    debugId: cap.entry.debugId,
  };

  const findings = [
    `Order stayed readable after approval: ${evidence.probes.map((p) => `${p.minutesAfterApproval}m=${p.state.status}`).join(", ")}`,
    `Capture attempted after the local order was cancelled: HTTP ${cap.status} ${evidence.captureAfterDelay.issue ?? evidence.captureAfterDelay.orderStatus}`,
    evidence.probes.every((p) => p.incident === "approved_not_captured_locally_cancelled")
      ? "Engine classified every probe as approved_not_captured_locally_cancelled and forbade auto_capture."
      : "Engine did not classify every probe as locally-cancelled; inspect evidence.probes.",
  ];
  const pass = evidence.probes.length > 0 && evidence.probes.every((p) => p.state.status === "APPROVED");
  return { name: "scenario1_approved_not_captured", pass, findings, evidence };
}

/** Scenario 2: captured at PayPal, merchant still says pending. Repair local only; never capture twice. */
export async function scenario2({ pp, io, mock = false }) {
  const ref = `inc2-${Date.now()}`;
  const evidence = {};
  const reqId = pp.newRequestId();
  const created = await pp.createOrder({ referenceId: ref, requestId: pp.newRequestId() });
  if (!created.ok) return fail("scenario2", "create order failed", created);
  const orderId = created.json.id;
  evidence.orderId = orderId;

  await io.humanStep(
    `Open this link, log in as a SANDBOX BUYER, and approve:\n  ${approvalLink(created.json)}`,
    () => mock && pp.mockApprove(orderId),
  );

  const first = await pp.captureOrder(orderId, reqId);
  evidence.firstCapture = { httpStatus: first.status, status: first.json?.status ?? null, captureId: captureOf(first.json)?.id ?? null, debugId: first.entry.debugId };
  if (!first.ok) return fail("scenario2", "first capture failed", first);

  // Merchant side never learned about it (webhook suppressed): local status stays "pending".
  const authoritative = await pp.getOrder(orderId);
  const state = paypalState(authoritative.json);
  const verdict = classify(state, { status: "pending" });
  evidence.verdict = verdict;

  // Safety probe: would a second capture create a second payment?
  const retrySameKey = await pp.captureOrder(orderId, reqId);
  const retryNewKey = await pp.captureOrder(orderId, pp.newRequestId());
  evidence.retrySameKey = { httpStatus: retrySameKey.status, captureId: captureOf(retrySameKey.json)?.id ?? null, issue: retrySameKey.json?.details?.[0]?.issue ?? null };
  evidence.retryNewKey = { httpStatus: retryNewKey.status, captureId: captureOf(retryNewKey.json)?.id ?? null, issue: retryNewKey.json?.details?.[0]?.issue ?? null };

  const secondPaymentCreated =
    [evidence.retrySameKey.captureId, evidence.retryNewKey.captureId].some((id) => id && id !== evidence.firstCapture.captureId);
  const findings = [
    `Engine verdict: ${verdict.incident}; safe actions: ${verdict.safeActions.join(", ")}; forbidden: ${verdict.forbiddenActions.join(", ")}`,
    `Capture retry with same key: HTTP ${evidence.retrySameKey.httpStatus} ${evidence.retrySameKey.issue ?? "(same capture)"}`,
    `Capture retry with NEW key: HTTP ${evidence.retryNewKey.httpStatus} ${evidence.retryNewKey.issue ?? ""}`,
    secondPaymentCreated ? "DANGER: a second distinct capture was created." : "No second capture was created.",
  ];
  const pass = verdict.incident === "captured_local_unpaid" && !secondPaymentCreated;
  return { name: "scenario2_captured_local_unpaid", pass, findings, evidence };
}

/** Scenario 3: lost create response. Does retrying with the same PayPal-Request-Id return the original order? */
export async function scenario3({ pp }) {
  const ref = `inc3-${Date.now()}`;
  const key = pp.newRequestId();
  const evidence = { requestId: key };

  const original = await pp.createOrder({ referenceId: ref, requestId: key });
  if (!original.ok) return fail("scenario3", "create order failed", original);
  evidence.originalOrderId = original.json.id; // pretend this response never reached the merchant

  const retrySame = await pp.createOrder({ referenceId: ref, requestId: key });
  const retryNew = await pp.createOrder({ referenceId: ref, requestId: pp.newRequestId() });
  evidence.retrySame = { httpStatus: retrySame.status, orderId: retrySame.json?.id ?? null };
  evidence.retryNewKey = { httpStatus: retryNew.status, orderId: retryNew.json?.id ?? null };

  const recovered = retrySame.json?.id === original.json.id;
  const duplicateWithNewKey = retryNew.json?.id && retryNew.json.id !== original.json.id;
  const findings = [
    recovered ? "Same key returned the ORIGINAL order id: lost responses are recoverable if the key was persisted." : "Same key did NOT return the original order id: idempotent recovery is not available as assumed.",
    duplicateWithNewKey ? "A new key created a DIFFERENT order: confirms the duplicate risk when the key is not persisted." : "A new key did not create a different order (unexpected).",
  ];
  return { name: "scenario3_lost_create_response", pass: recovered && !!duplicateWithNewKey, findings, evidence };
}

function fail(name, why, res) {
  return { name, pass: false, findings: [`${why}: HTTP ${res.status} ${JSON.stringify(res.json).slice(0, 300)}`], evidence: { debugId: res.entry?.debugId } };
}
