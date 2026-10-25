import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateEdits } from "./policy.ts";

const root = mkdtempSync(join(tmpdir(), "tf-policy-"));
mkdirSync(join(root, "routes"));
mkdirSync(join(root, "routes/__tests__"));
writeFileSync(join(root, "routes/products.js"), "x");
writeFileSync(join(root, "routes/products.test.js"), "x");
writeFileSync(join(root, "package.json"), "{}");
writeFileSync(join(root, ".env"), "SECRET=1");
writeFileSync(join(tmpdir(), "tf-outside.js"), "x");
symlinkSync(join(tmpdir(), "tf-outside.js"), join(root, "routes/link.js"));
const allow = ["routes/", "package.json"];
const one = (path: string) => validateEdits([{ path, content: "y" }], root, allow);

test("allows an existing file under an editable prefix", () => assert.equal(one("routes/products.js").ok, true));
test("rejects traversal and absolute paths", () => {
  assert.equal(one("routes/../package.json").ok, false);
  assert.equal(one("/etc/passwd").ok, false);
  assert.equal(one("../x.js").ok, false);
});
test("rejects tests, dependency manifests and dotfiles even when allowlisted", () => {
  assert.equal(one("routes/products.test.js").ok, false);
  assert.equal(one("package.json").ok, false);
  assert.equal(one(".env").ok, false);
});
test("rejects symlinks and new files", () => {
  assert.equal(one("routes/link.js").ok, false);
  assert.equal(one("routes/new.js").ok, false);
});
test("rejects paths outside the allowlist and empty proposals", () => {
  assert.equal(validateEdits([{ path: "server.js", content: "y" }], root, ["routes/"]).ok, false);
  assert.equal(validateEdits([], root, allow).ok, false);
});
