// SR-F-62 / BR-12 claims audit. Usage: node scripts/claims-audit.mjs [--root <dir>]   Exit 1 on any finding.
// Checks (all deterministic, no network):
//  A. register <-> Evidence Spec section 10 agree on every claim status
//  B. public text (README, docs/public, DEVPOST, VIDEO-SCRIPT, ui/) cites no claim ID unless PROVEN
//  C. public text and every string in the UI fixtures avoid the BRS 9.3 avoid-list and extraForbidden, unless a negation precedes the phrase in the same sentence
//  D. every "read-only" in public text sits in a paragraph that carries the qualification
//  F. no unresolved placeholder such as [PASTE ...], [TODO ...], [LIVE-RUN ...] remains in public text (submission gate)
//  E. README carries the required disclosures (Demo Honesty Ledger etc.)
// LIMITS: this is a phrase and reference guard. It does not decide whether a sentence is TRUE; a human still ticks each sentence against the register (BRS 9.3 rule 6).
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";

const AVOID = [/\broot cause\b/i, /\bcaused by\b/i, /\bguarantee[sd]?\b/i, /\bprevent(s|ed)?\b/i, /\beliminat(e|es|ed)\b/i, /\bzero\b/i, /\bautonomous(ly)?\b/i, /\balways\b/i, /\bnever\b/i, /\bfully\b/i, /\binstantly\b/i, /production-ready/i];
const NEG = /\b(no|not|nor|never|without|cannot|can't|isn't|aren't|doesn't|don't|does not|do not|nothing|none|forbidden|avoid|unproven)\b/i;
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".vite", "coverage", "screenshots", "fonts"]);
const SKIP_FILES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock"]);
const TEXT_EXT = new Set([".md", ".txt", ".html", ".js", ".jsx", ".ts", ".tsx", ".json", ".css"]);

export function classify(statusText) {
  const t = statusText.toUpperCase(), out = [];
  if (t.includes("FORBIDDEN")) out.push("FORBIDDEN");
  if (t.includes("UNPROVEN")) out.push("UNPROVEN");
  if (t.includes("PARTIAL")) out.push("PARTIAL");
  if (!out.length && (/\bPROVEN\b/.test(t) || /^\*{0,2}V FOR/.test(t))) out.push("PROVEN");
  return out;
}
function expandIds(cell) {
  const ids = [];
  for (const part of cell.split(",").map((x) => x.trim())) {
    const m = part.match(/^(C-\d+)([a-z])\/([a-z])$/);
    if (m) { ids.push(m[1] + m[2], m[1] + m[3]); continue; }
    const m2 = part.match(/^C-\d+[a-z]?$/); if (m2) ids.push(part);
  }
  return ids;
}
function walk(p, out = []) {
  if (!existsSync(p)) return out;
  if (statSync(p).isDirectory()) { for (const f of readdirSync(p)) if (!SKIP_DIRS.has(f)) walk(join(p, f), out); }
  else if (TEXT_EXT.has(extname(p)) && !SKIP_FILES.has(basename(p)) && !p.endsWith(".min.js")) out.push(p);
  return out;
}
function strings(v, out = []) { if (typeof v === "string") out.push(v); else if (Array.isArray(v)) v.forEach((x) => strings(x, out)); else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out)); return out; }
function sentences(text) { return text.split(/(?<=[.!?])\s+|\n+/); }

export function scanText(text, where, reg, findings, { allowNegation = true } = {}) {
  const extra = (reg.extraForbidden ?? []).map((s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  for (const s of sentences(text)) {
    for (const re of [...AVOID, ...extra]) {
      const m = re.exec(s); if (!m) continue;
      const before = s.slice(Math.max(0, m.index - 80), m.index);
      const negated = allowNegation && NEG.test(before);
      if (!negated) findings.push({ rule: "C", where, msg: `forbidden phrase "${m[0]}" without a preceding negation: ${s.trim().slice(0, 120)}` });
    }
  }
  for (const m of text.matchAll(/\[(?:PASTE|TODO|LIVE-RUN|FILL|TBD)[^\]]*\]/gi)) findings.push({ rule: "F", where, msg: `unresolved placeholder: ${m[0].slice(0, 80)}` });
  for (const m of text.matchAll(/\bC-\d+[a-z]?\b/g)) {
    const c = reg.claims[m[0]];
    if (!c) findings.push({ rule: "B", where, msg: `cites unknown claim ${m[0]}` });
    else if (c.status !== "PROVEN") findings.push({ rule: "B", where, msg: `cites ${m[0]}, whose status is ${c.status}, not PROVEN` });
  }
  for (const para of text.split(/\n\s*\n/)) {
    if (/read-only/i.test(para) && !/with respect to PayPal and WooCommerce|read-only here means/i.test(para))
      findings.push({ rule: "D", where, msg: `"read-only" without the qualification "with respect to PayPal and WooCommerce": ${para.trim().slice(0, 100)}` });
  }
}

export function audit({ root = fileURLToPath(new URL("../", import.meta.url)) } = {}) {
  const findings = [], P = (p) => join(root, p);
  const reg = JSON.parse(readFileSync(P("docs/claims-register.json"), "utf8"));
  // A
  const spec = readFileSync(P("docs/06-EVIDENCE-SPEC.md"), "utf8");
  const seen = new Set();
  for (const l of spec.split("\n")) {
    const cells = l.trim().replace(/^\||\|$/g, "").split("|").map((x) => x.trim());
    if (!/^C-\d/.test(cells[0] ?? "")) continue;
    const ids = expandIds(cells[0]), classes = classify(cells[2] ?? "");
    if (!ids.length) { findings.push({ rule: "A", where: "docs/06-EVIDENCE-SPEC.md", msg: `cannot parse claim ids: ${cells[0]}` }); continue; }
    for (const id of ids) {
      seen.add(id);
      const r = reg.claims[id];
      if (!r) findings.push({ rule: "A", where: "docs/claims-register.json", msg: `${id} is in the Evidence Spec but not in the register` });
      else if (!classes.includes(r.status)) findings.push({ rule: "A", where: "docs/claims-register.json", msg: `${id}: register says ${r.status}, Evidence Spec says ${classes.join("/") || "?"}` });
    }
  }
  for (const id of Object.keys(reg.claims)) if (!seen.has(id)) findings.push({ rule: "A", where: "docs/claims-register.json", msg: `${id} is in the register but not in the Evidence Spec` });
  // B, C, D on public text
  const files = [...new Set(reg.publicPaths.flatMap((p) => walk(P(p))))];
  for (const f of files) scanText(readFileSync(f, "utf8"), relative(root, f), reg, findings);
  // Drafts (docs/drafts): same wording and citation rules; unresolved placeholders are reported as notes, not failures. Moving a file out of drafts makes the placeholders fail.
  const notes = [];
  for (const f of [...new Set((reg.draftPaths ?? []).flatMap((p) => walk(P(p))))]) {
    const sub = []; scanText(readFileSync(f, "utf8"), relative(root, f), reg, sub);
    for (const x of sub) (x.rule === "F" ? notes : findings).push(x);
  }
  // C on fixture strings (UI copy). Exceptions must be listed in the register with a reason.
  const ex = reg.fixtureExceptions ?? [];
  const fdir = P(reg.publicFixtureDir);
  if (existsSync(fdir)) for (const f of readdirSync(fdir).filter((x) => x.endsWith(".json"))) {
    const sub = [];
    for (const s of strings(JSON.parse(readFileSync(join(fdir, f), "utf8")))) scanText(s, `${reg.publicFixtureDir}/${f}`, reg, sub);
    for (const x of sub) if (!ex.some((e) => x.msg.includes(e.match ?? e.phrase) && (!e.file || e.file === f) && e.reason)) findings.push(x);
  }
  // E
  const readme = existsSync(P("README.md")) ? readFileSync(P("README.md"), "utf8") : "";
  for (const req of reg.requiredInReadme ?? []) if (!readme.includes(req)) findings.push({ rule: "E", where: "README.md", msg: `missing required disclosure: "${req}"` });
  return { findings, notes, files: files.map((f) => relative(root, f)) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--root");
  const { findings, notes, files } = audit(i > 0 ? { root: process.argv[i + 1] } : {});
  for (const f of findings) console.error(`[${f.rule}] ${f.where}: ${f.msg}`);
  console.log(findings.length ? `CLAIMS AUDIT FAILED (${findings.length} finding(s))` : `claims audit passed (${files.length} public files + UI fixtures; phrase and reference guard only, not a truth check)`);
  if (notes.length) console.log(`NOTE: ${notes.length} unresolved placeholder(s) in drafts; submission is blocked until they are filled: ${[...new Set(notes.map((n) => n.where))].join(", ")}`);
  process.exit(findings.length ? 1 : 0);
}
