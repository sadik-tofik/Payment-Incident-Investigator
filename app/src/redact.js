// SR-N-12: redact personal data and token-like strings before logs, evidence files and AI input.
const SENSITIVE_KEYS = /^(payer|payee|name|given_name|surname|full_name|email|email_address|phone|phone_number|national_number|address|address_line_\d|admin_area_\d|postal_code|billing|shipping|customer|access_token|refresh_token|client_secret|secret|authorization|note|notes|customer_note)$/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BEARER = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/g;
// A long run is only treated as a token if it contains a digit. Long field names (letters and underscores) are not secrets.
const LONG_TOKEN = /\b(?=[A-Za-z_-]*\d)[A-Za-z0-9_-]{40,}\b/g;
const PHONE = /(?<![\w.])\+?\d[\d\s().-]{8,}\d(?![\w.])/g;

export function redactString(s) {
  return String(s).replace(EMAIL, "[email]").replace(BEARER, "$1 [token]").replace(LONG_TOKEN, "[token]").replace(PHONE, (m) => (/^\d{4}-\d{2}-\d{2}/.test(m) ? m : "[phone]"));
}
export function redact(v) {
  if (v == null) return v;
  if (typeof v === "string") return redactString(v);
  if (Array.isArray(v)) return v.map(redact);
  if (typeof v === "object") {
    const o = {};
    // `key` holds a field NAME in WooCommerce meta lists ({key, value}); field names are kept, values are still redacted.
    for (const [k, val] of Object.entries(v)) o[k] = SENSITIVE_KEYS.test(k) ? "[redacted]" : k === "key" && typeof val === "string" ? val : redact(val);
    return o;
  }
  return v;
}
