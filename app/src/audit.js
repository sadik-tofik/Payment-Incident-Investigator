// SRS 9: append-only hash chain. Interface has append, read, verify. No update, no delete.
// LIMIT (SR-F-42): detects modification of individual records; someone with disk access could rewrite the
// whole chain unless the head hash is kept elsewhere. Do not call this tamper-proof.
import { appendFileSync, existsSync, readFileSync, writeFileSync, openSync, fsyncSync, closeSync } from "node:fs";
import { canonical, sha256 } from "./canonical.js";

const GENESIS = "0".repeat(64);

export class AuditLog {
  constructor(path) {
    this.path = path;
    if (!existsSync(path)) writeFileSync(path, "");
    const recs = this.read();
    this.head = recs.length ? recs[recs.length - 1].hash : GENESIS;
    this.seq = recs.length;
    // Refuse to continue a log that is already broken (explicit recovery is required, not silent appends).
    const v = this.verify();
    this.corrupt = v.ok ? null : v;
  }
  read() {
    const t = readFileSync(this.path, "utf8");
    return t.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  }
  append(type, data) {
    if (this.corrupt) throw new Error(`audit log failed verification (${this.corrupt.reason} at record ${this.corrupt.brokenAt}); refusing to append`);
    // Full re-verification on EVERY append: an edit to an earlier record is caught even if the last record is untouched.
    const v = this.verify();
    if (!v.ok) { this.corrupt = v; throw new Error(`audit log failed verification (${v.reason} at record ${v.brokenAt}); refusing to append`); }
    if (v.head !== this.head) throw new Error("audit log changed on disk since it was opened; refusing to append");
    const body = { seq: this.seq + 1, type, data };
    const hash = sha256(this.head + canonical(body));
    const rec = { ...body, prevHash: this.head, hash };
    const fd = openSync(this.path, "a");
    try { appendFileSync(fd, JSON.stringify(rec) + "\n"); fsyncSync(fd); } finally { closeSync(fd); }
    this.head = hash; this.seq = rec.seq;
    return rec;
  }
  /** Returns {ok:true, count, head} or {ok:false, brokenAt, reason}. */
  verify() {
    let prev = GENESIS; let n = 0;
    let recs;
    try { recs = this.read(); } catch { return { ok: false, brokenAt: 1, reason: "unparseable_record" }; }
    for (const r of recs) {
      n++;
      const { prevHash, hash, ...body } = r;
      if (r.seq !== n) return { ok: false, brokenAt: n, reason: "sequence_gap_or_reorder" };
      if (prevHash !== prev) return { ok: false, brokenAt: n, reason: "prev_hash_mismatch" };
      if (sha256(prev + canonical(body)) !== hash) return { ok: false, brokenAt: n, reason: "hash_mismatch" };
      prev = hash;
    }
    return { ok: true, count: n, head: prev };
  }
}
