// HTTP API v1 (docs/05a-API-CONTRACT.md, LOCKED v1.0). READ-ONLY: GET and one POST that reads. Node built-ins only.
// Live mode is NOT wired in this build: mode "live" is always 403 mode_not_enabled. No model wrapper. Not for public deployment
// until rate limit and retention are decided (contract section 6): both are options here, off or bounded by default.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { AuditLog } from "./audit.js";
import { ApiError, errorBody, investigate, prepareInput, buildVersion } from "./orchestrator.js";
import { loadReplay, REPLAY_PLUGIN } from "./replay.js";
import { loadInjected } from "./injected.js";

const MAX_BODY = 16 * 1024;
const BASE = "/api/v1";

/** sources: { replay:{paypal,store,publicCases,caseToInput,plugin}, injected:{...} }. Tests may pass failing readers. */
export function createApp({ explainFn = null, auditPath, bundleDir = null, sources, corsOrigin = null, rateLimit = null, maxStored = 500, deadlineMs = 30000, now = () => new Date() } = {}) {
  const src = sources ?? { replay: { ...loadReplay(), plugin: REPLAY_PLUGIN }, injected: { ...loadInjected(), plugin: REPLAY_PLUGIN } };
  const audit = new AuditLog(auditPath);
  const store = new Map();                 // bounded in-memory retention (oldest evicted); real retention is a TDD decision
  const hits = new Map();

  const send = (res, status, body, extra = {}) => {
    const text = JSON.stringify(body);
    res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", ...(corsOrigin ? { "access-control-allow-origin": corsOrigin, vary: "Origin" } : {}), ...extra });
    res.end(text);
  };
  const fail = (res, e) => { const { status, body } = errorBody(e); send(res, status, body); };
  const readBody = (req) => new Promise((resolve, reject) => {
    let n = 0, tooBig = false; const chunks = [];
    // Oversized bodies are drained and discarded (so the client gets a 400, not a reset); a body over 1 MB is cut off.
    req.on("data", (c) => { n += c.length; if (n > 1024 * 1024) req.destroy(); else if (n > MAX_BODY) tooBig = true; else chunks.push(c); });
    req.on("end", () => { if (tooBig) return reject(new ApiError(400, "invalid_body", "body too large")); try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "null")); } catch { reject(new ApiError(400, "invalid_body", "body is not valid JSON")); } });
    req.on("error", () => reject(new ApiError(400, "invalid_body", "could not read body")));
  });
  const limited = (req) => {
    if (!rateLimit) return false;
    const k = req.socket.remoteAddress ?? "?", t = Date.now(), w = (hits.get(k) ?? []).filter((x) => t - x < rateLimit.windowMs);
    w.push(t); hits.set(k, w);
    if (hits.size > 5000) for (const [key, arr] of hits) { if (!arr.some((x) => t - x < rateLimit.windowMs)) hits.delete(key); if (hits.size <= 4000) break; }   // bound the map (stale clients first)
    if (hits.size > 5000) hits.delete(hits.keys().next().value);
    return w.length > rateLimit.max;
  };
  // Bound the limiter's memory: drop clients whose window has fully expired, and cap the table size.
  const sweep = () => { const t = Date.now(); for (const [k, w] of hits) if (!w.some((x) => t - x < (rateLimit?.windowMs ?? 0))) hits.delete(k); while (hits.size > 10000) hits.delete(hits.keys().next().value); };
  const sweeper = rateLimit ? setInterval(sweep, Math.max(1000, rateLimit.windowMs)) : null; sweeper?.unref?.();

  const handler = async (req, res) => {
    try {
      const url = new URL(req.url, "http://x"); const path = url.pathname.replace(/\/+$/, "");
      if (req.method === "OPTIONS" && corsOrigin) return send(res, 204, {}, { "access-control-allow-methods": "GET, POST", "access-control-allow-headers": "content-type" });
      if (!path.startsWith(BASE + "/") && path !== BASE) throw new ApiError(404, "not_found", "no such route");
      const rest = path.slice(BASE.length);
      const method = req.method;
      const only = (m) => { if (method !== m) throw new ApiError(405, "method_not_allowed", `use ${m}`); };

      if (rest === "/health") { only("GET"); return send(res, 200, { ok: true, build: buildVersion(), modesAvailable: Object.keys(src) }); }
      if (rest === "/cases") { only("GET"); return send(res, 200, Object.values(src).flatMap((s) => s.publicCases())); }
      if (rest === "/audit/verify") { only("GET"); const v = audit.verify(); return send(res, 200, v.ok ? { ok: true, entries: v.count, firstBadIndex: null } : { ok: false, entries: null, firstBadIndex: v.brokenAt }); }
      if (rest === "/investigations") {
        only("POST");
        if (limited(req)) throw new ApiError(429, "rate_limited", "too many requests");
        const body = await readBody(req);
        if (body?.mode === "live") throw new ApiError(403, "mode_not_enabled", "live mode is not enabled in this build");
        const input = prepareInput(body, Object.fromEntries(Object.entries(src).map(([m, s]) => [m, s.caseToInput])));
        const s = src[input.mode]; if (!s) throw new ApiError(403, "mode_not_enabled", "this mode is not enabled");
        const inv = await investigate({ mode: input.mode, paypalOrderId: input.paypalOrderId, localOrderId: input.localOrderId }, { explainFn, paypal: s.paypal, store: s.store, plugin: s.plugin, invoicePrefix: input.invoicePrefix ?? null, audit, bundleDir, deadlineMs, now });
        store.set(inv.id, inv); if (store.size > maxStored) store.delete(store.keys().next().value);
        return send(res, 200, inv);
      }
      let m;
      if ((m = rest.match(/^\/investigations\/([^/]+)$/))) { only("GET"); const inv = store.get(m[1]); if (!inv) throw new ApiError(404, "investigation_not_found", "no such investigation"); return send(res, 200, inv); }
      if ((m = rest.match(/^\/investigations\/([^/]+)\/evidence\/([^/]+)$/))) {
        only("GET"); const inv = store.get(m[1]); if (!inv) throw new ApiError(404, "investigation_not_found", "no such investigation");
        const ev = inv.evidence.find((e) => e.id === m[2]); if (!ev) throw new ApiError(404, "evidence_not_found", "no such evidence item");
        return send(res, 200, ev);
      }
      throw new ApiError(404, "not_found", "no such route");
    } catch (e) { fail(res, e instanceof ApiError ? e : new Error("internal")); }
  };
  return { server: createServer(handler), audit, store, _sweep: sweep };
}
