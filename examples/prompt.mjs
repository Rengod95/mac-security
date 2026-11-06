// Manual check: shows the real Touch ID / Mac password window.  node examples/prompt.mjs
import { createRequire } from "node:module";
const { authenticate, canAuthenticate, MacSecurityError } = createRequire(import.meta.url)("../index.js");

console.log("canAuthenticate:", canAuthenticate());
try {
  await authenticate("confirm mac-security works");
  console.log("authenticated");
} catch (error) {
  if (error instanceof MacSecurityError) console.log(`not authenticated: ${error.kind} (LAError ${error.laCode})`);
  else throw error;
}
