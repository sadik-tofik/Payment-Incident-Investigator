// Local dev server. Read-only with respect to PayPal and WooCommerce (creates local records). Live mode is not wired. Usage: node scripts/serve.mjs [port]   (CORS origin via UI_ORIGIN, default none)
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createApp } from "../app/src/server.js";
import { modelFnFromEnv } from "../app/src/modelClient.js";
const explainFn = modelFnFromEnv();   // null unless AI_ENABLED=1 and provider, model and key are all set
console.log(explainFn ? `AI explanations ON: ${explainFn.info.provider}/${explainFn.info.model} (validator-gated; templates on any failure)` : "AI explanations OFF (templates only)");
const port = Number(process.argv[2] ?? 8787);
mkdirSync(new URL("../app/out/", import.meta.url), { recursive: true });
const { server } = createApp({ explainFn, auditPath: fileURLToPath(new URL("../app/out/audit.jsonl", import.meta.url)), bundleDir: fileURLToPath(new URL("../app/out/bundles/", import.meta.url)), corsOrigin: process.env.UI_ORIGIN ?? null });
server.listen(port, "127.0.0.1", () => console.log(`API on http://127.0.0.1:${port}/api/v1 (replay + injected only; no PayPal or WooCommerce write)`));
