"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { canAuthenticate, loadNative } = require("../index.js");

test("canAuthenticate returns the documented shape", () => {
  const result = canAuthenticate();
  assert.deepEqual(Object.keys(result).sort(), ["available", "biometry"]);
  assert.equal(typeof result.available, "boolean");
  assert.ok(["touchid", "faceid", "none"].includes(result.biometry));
});

test("on macOS the addon loads", { skip: process.platform !== "darwin" }, () => {
  const native = loadNative();
  assert.notEqual(native, null);
  assert.equal(typeof native.canAuthenticate, "function");
  assert.equal(typeof native.authenticate, "function");
});

test("outside macOS canAuthenticate is unavailable", { skip: process.platform === "darwin" }, () => {
  assert.deepEqual(canAuthenticate(), { available: false, biometry: "none" });
});
