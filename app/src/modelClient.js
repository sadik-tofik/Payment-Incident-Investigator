// Optional AI explainer (SRS SR-F-20..26, SR-I-30). OFF unless a caller passes the result of createModelFn() to the server.
// The model only REPHRASES what the engine produced; explain() validates its output and falls back to the template (never throws).
// Network: only the provider's own fixed HTTPS host; the key for that provider is the only credential it ever sees (SR-F-25).
// No tool calling. No PayPal or store access. The key is never logged or included in an error message.
import { buildModelInput } from "./explain.js";

export const PROMPT_VERSION = "expl-1";
export const PROVIDERS = Object.freeze({
  gemini: { host: "generativelanguage.googleapis.com", envKey: "GEMINI_API_KEY" },
  nvidia: { host: "integrate.api.nvidia.com", envKey: "NVIDIA_API_KEY" },
});

const SYSTEM = `You rewrite a payment-investigation result into short plain English for a merchant.
RULES (all mandatory):
1. Use ONLY facts, values and evidenceIds present in the JSON input. Add no fact, number, date, status word, cause or advice that is not in the input.
2. Output ONLY one JSON object: {"summary": string, "abstained": boolean, "statements": [{"text": string, "evidenceIds": [string]}]}.
3. Every statement must list at least one evidenceId from the input's evidence array.
4. If verdict is "unknown", set abstained to true and say the evidence is not sufficient.
5. Do not say or imply a root cause, a guarantee, that something will complete, or that an action is safe or approved. Do not use the words: guarantee, prevent, eliminate, zero, autonomous, always, never, fully, instantly, root cause, caused by, production-ready.
6. Suggested actions are for a human only; you may restate the listed safeActions and forbiddenActions in words, nothing else.
7. Keep it under 120 words in total.`;

function parseJson(text) {
  const t = String(text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(t);
}

export function createModelFn({ provider, model, apiKey, fetchImpl = globalThis.fetch, maxCalls = 50, maxOutputTokens = 600, timeoutMs = 12000, baseUrl = null } = {}) {
  const P = PROVIDERS[provider];
  if (!P) throw new Error("unknown_provider");
  if (!model || typeof model !== "string" || !/^[A-Za-z0-9._\-\/:]{2,80}$/.test(model)) throw new Error("invalid_model_id");
  if (!apiKey || typeof apiKey !== "string") throw new Error("missing_api_key");
  const url = baseUrl ?? (provider === "gemini"
    ? `https://${P.host}/v1beta/models/${encodeURIComponent(model)}:generateContent`
    : `https://${P.host}/v1/chat/completions`);
  if (new URL(url).hostname !== P.host && baseUrl === null) throw new Error("host_not_allowed");
  let calls = 0;

  async function fn(structured) {
    if (calls >= maxCalls) throw new Error("call_budget_exhausted");
    calls++;
    const user = JSON.stringify(structured);
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      let res;
      if (provider === "gemini") {
        res = await fetchImpl(url, { method: "POST", signal: ctrl.signal, redirect: "error", headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: "user", parts: [{ text: user }] }], generationConfig: { temperature: 0, maxOutputTokens, responseMimeType: "application/json" } }) });
      } else {
        res = await fetchImpl(url, { method: "POST", signal: ctrl.signal, redirect: "error", headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, temperature: 0, max_tokens: maxOutputTokens, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }] }) });
      }
      if (!res.ok) throw new Error(`provider_http_${res.status}`);
      const body = await res.json();
      const text = provider === "gemini" ? body?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") : body?.choices?.[0]?.message?.content;
      return parseJson(text);
    } finally { clearTimeout(t); }
  }
  fn.info = Object.freeze({ provider, model, promptVersion: PROMPT_VERSION });
  fn.callsUsed = () => calls;
  return fn;
}

/** Reads env: AI_ENABLED=1, AI_PROVIDER=gemini|nvidia, AI_MODEL=<id>, GEMINI_API_KEY or NVIDIA_API_KEY, AI_MAX_CALLS (default 50). Returns null (templates only) unless every part is present. */
export function modelFnFromEnv(env = process.env, opts = {}) {
  if (env.AI_ENABLED !== "1") return null;
  const provider = env.AI_PROVIDER, P = PROVIDERS[provider];
  if (!P) throw new Error("AI_ENABLED=1 but AI_PROVIDER must be gemini or nvidia");
  return createModelFn({ provider, model: env.AI_MODEL, apiKey: env[P.envKey], maxCalls: Number(env.AI_MAX_CALLS ?? 50), ...opts });
}
export { buildModelInput };
