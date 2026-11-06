# mac-security

Touch ID, or the Mac password when Touch ID is not available, for Node and Electron.

Electron's `systemPreferences.promptTouchID` only accepts a fingerprint: a Mac without Touch ID, with a closed lid, or with a lockout cannot confirm. This small N-API addon calls `LAContext.evaluatePolicy` with `LAPolicyDeviceOwnerAuthentication`, so macOS shows the Touch ID window and falls back to the Mac password (the same behaviour as Tauri-style re-auth).

macOS only (arm64 first, deployment target 12.0). On other platforms nothing native is loaded: `canAuthenticate()` returns `{ available: false, biometry: "none" }` and `authenticate()` rejects with kind `unavailable`.

## Install

```sh
npm install github:Rengod95/mac-security
```

The install hook uses a bundled prebuild when one exists, otherwise it compiles `src/auth.mm` with node-gyp (needs Xcode command line tools).

## API

```ts
type ReauthKind = "cancelled" | "denied" | "unavailable" | "failed";
interface Availability { available: boolean; biometry: "touchid" | "faceid" | "none" }

canAuthenticate(): Availability;              // sync, never throws
authenticate(reason: string): Promise<void>;  // rejects with MacSecurityError
class MacSecurityError extends Error { kind: ReauthKind; laCode: number }
reasonText(reason: string): string;           // pure: how the reason is cleaned
kindOfLaCode(code: number): ReauthKind;       // pure: LAError code -> kind
```

- `reason` is cleaned before it is shown: control characters become spaces, runs of whitespace become one space, cut at 120 code points; empty becomes `"Fresnel"`.
- `kind`: `denied` (-1), `cancelled` (-2, -3, -4, -9), `unavailable` (-5, -6, -7, -8, -1004), everything else `failed`. `laCode` is the raw LAError code (`0` if there was no native result).

## Try it by hand

`authenticate` opens a real system window, so it is not part of the automated tests:

```sh
npm install && npm run build
node examples/prompt.mjs
```

## Electron apps

A `.node` file cannot be loaded from inside `app.asar`. Unpack it (`asarUnpack: ["**/*.node"]`, i.e. `app.asar.unpacked`) or copy it into `Contents/Resources`, and code-sign it with the rest of the app (hardened runtime and notarization both check nested binaries). `index.js` resolves `build/Release/` and `prebuilds/darwin-<arch>/` relative to itself, so keep the package folder layout when you unpack.

## Releases

Pushing a `v*` tag builds a prebuild (`prebuildify --napi`) and attaches it to the GitHub release.

## License

MIT
