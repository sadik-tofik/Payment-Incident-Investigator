// Regenerates docs/ui-fixtures/*.json from the real HTTP server. Run: node scripts/gen-ui-fixtures.mjs
import { writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { buildFixtures } from "./ui-fixture-defs.mjs";
const dir = new URL("../docs/ui-fixtures/", import.meta.url);
const fx = await buildFixtures();
for (const f of readdirSync(dir)) if (f.endsWith(".json") && !(f in fx)) unlinkSync(new URL(f, dir));
for (const [n, v] of Object.entries(fx)) writeFileSync(new URL(n, dir), JSON.stringify(v, null, 2) + "\n");
console.log(`${Object.keys(fx).length} fixtures written`);
