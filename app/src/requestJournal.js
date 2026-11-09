// SR-F-50..52: persist the request ID BEFORE sending. Write-ahead, synchronous, fsynced.
import { appendFileSync, existsSync, readFileSync, openSync, fsyncSync, closeSync } from "node:fs";
import { randomUUID } from "node:crypto";

export class RequestJournal {
  constructor(path) { this.path = path; }
  #write(rec) { const fd = openSync(this.path, "a"); try { appendFileSync(fd, JSON.stringify(rec) + "\n"); fsyncSync(fd); } finally { closeSync(fd); } }
  entries() { return existsSync(this.path) ? readFileSync(this.path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; }
  persist(label) { const requestId = randomUUID(); this.#write({ kind: "intent", label, requestId, at: new Date().toISOString() }); return requestId; }
  resolve(requestId, outcome) { this.#write({ kind: "outcome", requestId, outcome, at: new Date().toISOString() }); }
  /** IDs with an intent but no recorded outcome. */
  unresolved() {
    const all = this.entries();
    const done = new Set(all.filter((e) => e.kind === "outcome").map((e) => e.requestId));
    return all.filter((e) => e.kind === "intent" && !done.has(e.requestId));
  }
  /** SR-F-51: honest status for a call label. */
  assess(label) {
    const intents = this.entries().filter((e) => e.kind === "intent" && e.label === label);
    if (intents.length === 0) return { status: "no_request_id_persisted", warning: "No request ID was persisted for this call; recovery cannot be offered." };
    const u = this.unresolved().filter((e) => e.label === label);
    return u.length ? { status: "unresolved", requestIds: u.map((e) => e.requestId) } : { status: "resolved" };
  }
  /** send(requestId) -> Promise. Persist first; on throw, leave unresolved; never create a new ID on retry. */
  /** `label` must identify ONE logical operation. If that operation has an unresolved request, its stored ID is reused;
   *  a new ID is never minted while an earlier one is unresolved (a new PayPal request ID creates a separate order). */
  async run(label, send) {
    // One in-flight operation per label. A second concurrent call is rejected, not given a new ID.
    this.inflight ??= new Set();
    if (this.inflight.has(label)) return { error: "operation_in_flight", label, unresolved: false, rejected: true };
    this.inflight.add(label);
    try { return await this.#run(label, send); } finally { this.inflight.delete(label); }
  }
  async #run(label, send) {
    const existing = this.unresolved().find((e) => e.label === label);
    const requestId = existing ? existing.requestId : this.persist(label);
    try { const r = await send(requestId); this.resolve(requestId, "response_received"); return { requestId, result: r }; }
    catch (e) { return { requestId, error: String(e?.message ?? e), unresolved: true }; }
  }
  async retryUnresolved(send) {
    const out = [];
    this.inflight ??= new Set();
    for (const u of this.unresolved()) {
      // Same guard as run(): never overlap with an in-flight call for the same label.
      if (this.inflight.has(u.label)) { out.push({ requestId: u.requestId, rejected: true, error: "operation_in_flight" }); continue; }
      this.inflight.add(u.label);
      try { const r = await send(u.requestId); this.resolve(u.requestId, "response_received_on_retry"); out.push({ requestId: u.requestId, result: r }); }
      catch (e) { out.push({ requestId: u.requestId, error: String(e?.message ?? e), unresolved: true }); }
      finally { this.inflight.delete(u.label); }
    }
    return out;
  }
}
