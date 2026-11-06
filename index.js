"use strict";
// mac-security: Touch ID, or the Mac password when Touch ID is not available (LAPolicyDeviceOwnerAuthentication).

const fs = require("node:fs");
const path = require("node:path");

const MAX_REASON_CHARS = 120;
const DEFAULT_REASON = "Fresnel";

class MacSecurityError extends Error {
  /** @param {string} kind @param {number} laCode @param {string} [message] */
  constructor(kind, laCode, message) {
    super(message ?? `mac-security: ${kind} (LAError ${laCode})`);
    this.name = "MacSecurityError";
    this.kind = kind;
    this.laCode = laCode;
  }
}

/** Text shown in the system window: control chars -> space, whitespace runs -> one space, cut at 120 code points, no trailing space. Empty -> "Fresnel". */
function reasonText(reason) {
  const text = String(reason)
    .replaceAll(/\p{Cc}/gu, " ")
    .split(/\p{White_Space}+/u)
    .filter((word) => word !== "")
    .join(" ");
  if (text === "") return DEFAULT_REASON;
  return Array.from(text).slice(0, MAX_REASON_CHARS).join("").trimEnd();
}

/** LAError code -> kind. Unknown codes are "failed". */
function kindOfLaCode(code) {
  switch (code) {
    case -1:
      return "denied";
    case -2:
    case -3:
    case -4:
    case -9:
      return "cancelled";
    case -5:
    case -6:
    case -7:
    case -8:
    case -1004:
      return "unavailable";
    default:
      return "failed";
  }
}

/** prebuildify writes prebuilds/darwin-<arch>/<package name>.node */
function prebuildFiles(root) {
  const dir = path.join(root, "prebuilds", `darwin-${process.arch}`);
  try {
    return fs.readdirSync(dir).filter((name) => name.endsWith(".node")).map((name) => path.join(dir, name));
  } catch {
    return [];
  }
}

let cached;
/** Loads the addon once; null when this is not macOS or no binary is found. */
function loadNative() {
  if (cached !== undefined) return cached;
  cached = null;
  if (process.platform !== "darwin") return cached;
  const candidates = [
    path.join(__dirname, "build", "Release", "mac_security.node"),
    ...prebuildFiles(__dirname),
  ];
  for (const file of candidates) {
    try {
      cached = require(file);
      return cached;
    } catch {
      // try the next one
    }
  }
  return cached;
}

function canAuthenticate() {
  try {
    const native = loadNative();
    if (native === null) return { available: false, biometry: "none" };
    const result = native.canAuthenticate();
    const biometry = result.biometry === "touchid" || result.biometry === "faceid" ? result.biometry : "none";
    return { available: result.available === true, biometry };
  } catch {
    return { available: false, biometry: "none" };
  }
}

async function authenticate(reason) {
  if (typeof reason !== "string") throw new TypeError("reason must be a string");
  const native = loadNative();
  if (native === null) {
    // Not macOS, or the addon binary is missing. There is no LAError; laCode is 0.
    throw new MacSecurityError("unavailable", 0, "mac-security: native addon is not available on this platform");
  }
  let code;
  try {
    code = await native.authenticate(reasonText(reason));
  } catch (cause) {
    const error = new MacSecurityError("failed", 0, "mac-security: native call failed");
    error.cause = cause;
    throw error;
  }
  if (code === 0) return;
  throw new MacSecurityError(kindOfLaCode(code), code);
}

module.exports = { loadNative, prebuildFiles, canAuthenticate, authenticate, MacSecurityError, reasonText, kindOfLaCode };
