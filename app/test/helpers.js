import { PayPalReader } from "../src/paypalClient.js";
/** TEST ONLY. Lets a local mock server stand in for the sandbox. Not importable from src. */
export class TestPayPalReader extends PayPalReader {
  constructor(opts) { super({ ...opts, base: "https://api-m.sandbox.paypal.com" }); this.base = opts.base; this.allowed = opts.allowedHosts; }
  _hosts() { return [...(this.allowed ?? []), "api-m.sandbox.paypal.com"]; }
}
