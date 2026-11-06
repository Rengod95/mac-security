"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { reasonText, kindOfLaCode, MacSecurityError } = require("../index.js");

test("reasonText cleans control chars and whitespace", () => {
  assert.equal(reasonText("a\u0000b\tc\n\nd"), "a b c d");
  assert.equal(reasonText("  hello   world  "), "hello world");
  assert.equal(reasonText("Reveal secret"), "Reveal secret");
});
test("reasonText falls back to Fresnel when empty", () => {
  assert.equal(reasonText(""), "Fresnel");
  assert.equal(reasonText(" \n\t\u0007 "), "Fresnel");
});
test("reasonText cuts at 120 code points without trailing space", () => {
  assert.equal(reasonText("a".repeat(200)), "a".repeat(120));
  assert.equal(reasonText("😀".repeat(130)), "😀".repeat(120));
  assert.equal(reasonText(`${"a".repeat(119)} bbb`), "a".repeat(119));
});
test("kindOfLaCode table", () => {
  const table = new Map([
    [-1, "denied"],
    [-2, "cancelled"], [-3, "cancelled"], [-4, "cancelled"], [-9, "cancelled"],
    [-5, "unavailable"], [-6, "unavailable"], [-7, "unavailable"], [-8, "unavailable"], [-1004, "unavailable"],
    [-10, "failed"], [-11, "failed"], [-12, "failed"], [0, "failed"], [-999, "failed"], [42, "failed"],
  ]);
  for (const [code, kind] of table) assert.equal(kindOfLaCode(code), kind, `code ${code}`);
});
test("MacSecurityError carries kind and laCode", () => {
  const error = new MacSecurityError("denied", -1);
  assert.equal(error.kind, "denied");
  assert.equal(error.laCode, -1);
  assert.ok(error instanceof Error);
});
