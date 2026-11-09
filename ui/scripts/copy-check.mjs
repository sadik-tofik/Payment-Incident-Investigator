// ui/scripts/copy-check.mjs
// Build gate: runs claims audit against the entire repository including ui/
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../");
try {
  execSync("node scripts/claims-audit.mjs", { cwd: root, stdio: "inherit" });
} catch {
  console.error("Copy check failed: claims audit flagged text in ui/");
  process.exit(1);
}
