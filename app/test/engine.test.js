import { test } from "node:test";
import assert from "node:assert/strict";
import { diagnose, VERDICT } from "../src/engine.js";
import { LABELLED, mkPaypal, mkLocal } from "../src/scenarios.js";
import { stateFingerprint } from "../src/fingerprint.js";
import { canonical, sha256 } from "../src/canonical.js";
import { toMinor } from "../src/normalize.js";

const run = (c, opts) => diagnose({ paypal: c.paypal, local: c.local, match: c.match }, opts);

test("BO-2a style: every labelled case gets its human label (reference store, injected)", () => {
  const wrong = LABELLED.filter((c) => run(c).verdict !== c.expect).map((c) => c.name);
  assert.deepEqual(wrong, []);
  assert.ok(LABELLED.filter((c) => c.p0).length >= 5);
});

test("SR-F-10 determinism: 100 runs give byte-identical output", () => {
  for (const c of LABELLED) {
    const hashes = new Set(Array.from({ length: 100 }, () => sha256(canonical(run(c)))));
    assert.equal(hashes.size, 1, c.name);
  }
});

test("SAF table: every verdict forbids refund and auto_capture; capture rules hold; no unsafe recommendation (BO-3)", () => {
  for (const tiers of [[1], [1, 2], [1, 2, 3]]) {
    for (const c of LABELLED) {
      const r = run(c, { tiers });
      const forb = r.forbiddenActions.map((a) => a.action);
      const safe = r.safeActions.map((a) => a.action);
      assert.ok(forb.includes("refund") && forb.includes("auto_capture") && forb.includes("auto_repair"), c.name);
      for (const f of r.forbiddenActions) assert.ok(f.reason && f.rule, `${c.name} forbidden needs reason and rule`);
      assert.ok(!safe.some((a) => forb.includes(a)), `${c.name}: an action is both safe and forbidden`);
      if (safe.includes("capture_with_approval")) { assert.equal(r.verdict, VERDICT.APPROVED_NOT_CAPTURED); assert.ok(tiers.includes(3)); assert.notEqual(c.local.normalizedStatus, "cancelled"); }
      if (safe.includes("mark_local_paid")) { assert.equal(r.verdict, VERDICT.CAPTURED_LOCAL_UNPAID); assert.ok(tiers.includes(2)); }
      if (["multiple_captures", "amount_mismatch", "unknown", "captured_local_cancelled", "approved_not_captured_locally_cancelled"].includes(r.verdict)) {
        assert.ok(!safe.includes("capture_with_approval") && !safe.includes("mark_local_paid"), c.name);
        assert.ok(forb.includes("capture"), c.name);
      }
      assert.ok(safe.every((a) => r.safeActions.find((x) => x.action === a).rule), c.name);
    }
  }
});

test("Tier 1 (default) offers no write action at all", () => {
  for (const c of LABELLED) {
    const r = run(c);
    assert.ok(!r.safeActions.some((a) => a.requiresApproval), c.name);
  }
});

test("detector can fail: a deliberately wrong expectation is caught", () => {
  const c = LABELLED.find((x) => x.name === "multiple captures");
  assert.notEqual(run(c).verdict, "ok");
});

test("injected flag propagates; real-looking data without the flag is not labelled injected", () => {
  const c = LABELLED[0];
  assert.equal(run(c).injected, true);
  const r = diagnose({ paypal: { ...c.paypal, injected: false }, local: { ...c.local, injected: false }, match: c.match });
  assert.equal(r.injected, false);
});

test("fingerprint (SRS 6.3): stable under retrievedAt/raw changes; changes when any decision field changes", () => {
  const base = LABELLED.find((x) => x.name === "P0-B captured local pending");
  const f0 = run(base).stateFingerprint;
  const m = base.match;
  const reread = { match: m, paypal: { ...base.paypal, retrievedAt: "2030-01-01T00:00:00Z", rawSha256: "other" }, local: { ...base.local, retrievedAt: "2030-01-01T00:00:01Z", rawSha256: "other2" } };
  assert.equal(diagnose(reread).stateFingerprint, f0);
  const changes = [
    { paypal: { ...base.paypal, orderStatus: "APPROVED" }, local: base.local },
    { paypal: { ...base.paypal, captures: [{ ...base.paypal.captures[0], status: "PENDING" }] }, local: base.local },
    { paypal: { ...base.paypal, captures: [{ ...base.paypal.captures[0], amount: "11.00" }] }, local: base.local },
    { paypal: base.paypal, local: { ...base.local, normalizedStatus: "paid" } },
    { paypal: base.paypal, local: { ...base.local, total: "11.00" } },
    { paypal: base.paypal, local: { ...base.local, paypalOrderIdRef: "OTHER" } },
    { paypal: base.paypal, local: { ...base.local, localOrderId: "WC-2" } },
  ];
  for (const ch of changes) assert.notEqual(diagnose({ ...ch, match: m }).stateFingerprint, f0);
});

test("SR-F-11: P0-A gives observed time only; never an event time (no approval timestamp exists)", () => {
  const r = run(LABELLED.find((x) => x.name === "P0-A approved not captured"));
  assert.equal(r.divergencePoint.timeKind, "observed");
  assert.match(r.divergencePoint.statement, /disagreement observed at/);
});

test("SR-F-11 (review): event time is OFF by default; history alone, even 'complete', does not promote it", () => {
  const base = LABELLED.find((x) => x.name === "P0-B captured local pending");
  assert.equal(run(base).divergencePoint.timeKind, "observed");
  const hist = [{ status: "pending", time: "2026-11-01T10:00:00Z" }];
  const withHist = { ...base, local: { ...base.local, statusHistory: hist, statusHistoryComplete: true, dateModified: "2026-11-01T10:05:01Z" } };
  assert.equal(run(withHist).divergencePoint.timeKind, "observed");               // flag off
  assert.equal(run({ ...base, local: { ...base.local, statusHistory: hist } }, { eventTimeVerified: true }).divergencePoint.timeKind, "observed"); // history not declared complete
});

test("SR-F-11 (review): event time only with explicit flag + declared-complete history; raw statuses are normalised", () => {
  const base = LABELLED.find((x) => x.name === "P0-B captured local pending");
  const hist = [{ status: "pending", time: "2026-11-01T10:00:00Z" }];
  const ok = run({ ...base, local: { ...base.local, statusHistory: hist, statusHistoryComplete: true } }, { eventTimeVerified: true }).divergencePoint;
  assert.equal(ok.timeKind, "event"); assert.equal(ok.time, "2026-11-01T10:05:00Z");
  for (const paidRaw of ["processing", "completed"]) {
    const paid = run({ ...base, local: { ...base.local, statusHistory: [...hist, { status: paidRaw, time: "2026-11-01T10:06:00Z" }], statusHistoryComplete: true } }, { eventTimeVerified: true }).divergencePoint;
    assert.equal(paid.timeKind, "observed", paidRaw);
  }
});

test("SR-F-11: abstains when no timestamps exist", () => {
  const base = LABELLED.find((x) => x.name === "P0-A approved not captured");
  const r = diagnose({ paypal: { ...base.paypal, retrievedAt: undefined }, local: { ...base.local, retrievedAt: undefined }, match: base.match });
  assert.deepEqual(r.divergencePoint, { kind: "abstain", reason: "missing_timestamp" });
});

test("SR-F-12: no causal wording in any engine text", () => {
  for (const c of LABELLED) { const r = run(c); const txt = JSON.stringify([r.reason, r.divergencePoint, r.safeActions, r.forbiddenActions]); assert.doesNotMatch(txt, /root cause|caused by/i, c.name); }
});

test("SR-F-13: multiple captures are never summed; amounts use integer minor units", () => {
  assert.equal(toMinor("10.10", "USD"), 1010n);
  assert.equal(toMinor("0.1", "USD"), 10n);
  assert.equal(toMinor("100", "JPY"), 100n);
  assert.equal(toMinor("10.005", "USD"), null);
  assert.equal(toMinor("ten", "USD"), null);
  assert.equal(toMinor("10.00", "KWD"), null); // unsupported currency is unknown, never guessed
  assert.equal(toMinor("10.00", undefined), null);
  assert.equal(toMinor("19.99", "USD") + toMinor("0.01", "USD"), 2000n);
});

test("SR-F-09: an unreadable system is never inferred", () => {
  const r = diagnose({ paypal: { unreadable: true, readError: "HTTP 500" }, local: mkLocal("processing"), match: { localCount: 1, paypalCount: 1 } });
  assert.equal(r.verdict, "unknown"); assert.equal(r.decisionStatus, "abstain");
  assert.ok(r.forbiddenActions.some((a) => a.action === "capture") && r.forbiddenActions.some((a) => a.action === "mark_local_paid"));
});

test("engine source contains no model call, clock read, randomness or network", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../src/engine.js", import.meta.url), "utf8");
  assert.doesNotMatch(src, /Date\.now|new Date|Math\.random|fetch\(|randomUUID|import .*explain/);
});

test("review: absent or malformed match evidence abstains; it never implies a unique match", () => {
  const c = LABELLED.find((x) => x.name === "P0-B captured local pending");
  for (const bad of [undefined, null, {}, { localCount: 0, paypalCount: 1 }, { localCount: "1", paypalCount: 1 }, { localCount: 1 }]) {
    const r = diagnose({ paypal: c.paypal, local: c.local, match: bad });
    assert.equal(r.verdict, "unknown", JSON.stringify(bad));
    assert.equal(r.reason, "missing_match_evidence");
    assert.ok(!r.safeActions.some((a) => a.requiresApproval));
  }
  assert.equal(diagnose({ paypal: c.paypal, local: c.local }).verdict, "unknown");
});

test("review: decisionStatus is 'rule_matched' or 'abstain', and there is no confidence field", () => {
  for (const c of LABELLED) { const r = diagnose({ paypal: c.paypal, local: c.local, match: c.match }); assert.ok(["rule_matched", "abstain"].includes(r.decisionStatus)); assert.equal("confidence" in r, false); }
});
