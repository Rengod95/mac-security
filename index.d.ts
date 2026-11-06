export type ReauthKind = "cancelled" | "denied" | "unavailable" | "failed";
export interface Availability {
  available: boolean;
  biometry: "touchid" | "faceid" | "none";
}
/** Synchronous, never throws. Outside macOS: `{ available: false, biometry: "none" }`. */
export function canAuthenticate(): Availability;
/** Shows the Touch ID / Mac password window. Rejects with MacSecurityError when not authenticated. */
export function authenticate(reason: string): Promise<void>;
export class MacSecurityError extends Error {
  readonly kind: ReauthKind;
  /** The LAError code; 0 when there was no native result (not macOS, addon missing). */
  readonly laCode: number;
  constructor(kind: ReauthKind, laCode: number, message?: string);
}
/** Cleans the reason for the system window (pure). */
export function reasonText(reason: string): string;
/** Maps an LAError code to a kind (pure). */
export function kindOfLaCode(code: number): ReauthKind;
