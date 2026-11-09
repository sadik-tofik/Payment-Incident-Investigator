import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const SCRIPT = fileURLToPath(new URL("../../scripts/prepush-check.sh", import.meta.url));
function repo(files) {
  const d = mkdtempSync(join(tmpdir(), "prepush-"));
  mkdirSync(join(d, "scripts"));
  copyFileSync(SCRIPT, join(d, "scripts/prepush-check.sh"));
  writeFileSync(join(d, "scripts/claims-audit.mjs"), "console.log('stub audit ok');\n");
  for (const [p, c] of Object.entries(files)) { mkdirSync(join(d, p, ".."), { recursive: true }); writeFileSync(join(d, p), c); }
  return d;
}
const run = (d) => spawnSync("bash", ["scripts/prepush-check.sh"], { cwd: d, encoding: "utf8" });
const FAKE_ID = "B" + "Ax3lLlQiDn".repeat(7) + "Zz"; // 72 chars, fake
const FAKE_SECRET = "E" + "DFLr4UR3Qz".repeat(7) + "Yy";

test("pre-push: a pasted PayPal credentials note (labels plus a long token) fails and the secret is never printed", () => {
  const d = repo({ "draft.txt": `Client ID\n${FAKE_ID}\n\nSecret key 1\n${FAKE_SECRET}\n\nPassword\nhunter2hunter2\n`, "README.md": "hello\n" });
  const r = run(d);
  assert.notEqual(r.status, 0);
  assert.ok(r.stdout.includes("draft.txt"));
  assert.ok(!r.stdout.includes(FAKE_ID) && !r.stdout.includes(FAKE_SECRET) && !r.stdout.includes("hunter2"), "matched text must not be echoed");
  assert.ok(r.stdout.includes("RESULT: FIX THE ITEMS"));
});
test("pre-push: a clean repository passes (SHA-256 hashes and package-lock integrity strings are not mistaken for secrets)", () => {
  const hex = "a".repeat(64);
  const d = repo({ "README.md": "hello\n", "evidence/SHA256SUMS": `${hex}  file.json\n`, "package-lock.json": '{"integrity":"sha512-' + "A1b2".repeat(30) + '=="}' });
  const r = run(d);
  assert.equal(r.status, 0, r.stdout);
  assert.ok(r.stdout.includes("RESULT: clean"));
});
test("pre-push: env files, zips and raw/out directories fail", () => {
  assert.notEqual(run(repo({ ".env": "X=1\n" })).status, 0);
  assert.notEqual(run(repo({ "a/raw/x.json": "{}" })).status, 0);
  assert.notEqual(run(repo({ "x.zip": "z" })).status, 0);
});
