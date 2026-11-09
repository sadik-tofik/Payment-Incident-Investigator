import { createHash } from "node:crypto";
/** Canonical JSON: sorted keys, no whitespace, undefined dropped. Same input gives the same bytes. */
export function canonical(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  const keys = Object.keys(v).filter((k) => v[k] !== undefined).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
}
export const sha256 = (s) => createHash("sha256").update(s).digest("hex");
