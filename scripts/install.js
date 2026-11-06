"use strict";
// Install hook: skip outside macOS; use a bundled prebuild if one loads; otherwise compile with node-gyp.
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { prebuildFiles } = require("../index.js");

if (process.platform !== "darwin") process.exit(0);
const root = path.join(__dirname, "..");
for (const file of [
  path.join(root, "build", "Release", "mac_security.node"),
  ...prebuildFiles(root),
]) {
  try {
    require(file);
    process.exit(0);
  } catch {
    // keep looking
  }
}
const run = spawnSync(process.execPath, [require.resolve("node-gyp/bin/node-gyp.js"), "rebuild"], { cwd: root, stdio: "inherit" });
process.exit(run.status ?? 1);
