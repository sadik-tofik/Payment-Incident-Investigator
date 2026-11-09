import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { build } from "../../scripts/ivm.mjs";

test("IVM: every cited test title and artifact path exists, every BR/SR ID is present, and docs/07-IVM.md equals the generator output (no drift)", () => {
  const { md, errors } = build();
  assert.deepEqual(errors, []);
  assert.equal(readFileSync(new URL("../../docs/07-IVM.md", import.meta.url), "utf8"), md);
});
