import * as OTPAuth from "otpauth";

const ISSUER = "Care RAG";
const ALGORITHM = "SHA1";
const DIGITS = 6;
const PERIOD = 30;

export function generateTotpSecret(): OTPAuth.Secret {
  return new OTPAuth.Secret({ size: 20 });
}

function totp(secretBase32: string, label: string) {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

function currentTotpStep(): number {
  return Math.floor(Date.now() / 1000 / PERIOD);
}

export type TotpVerification = { valid: true; step: number } | { valid: false };

/**
 * Verifies a submitted code against a device's secret, allowing +/-1 time
 * step of clock drift (~90s total). Pass `lastUsedStep` (the step accepted
 * on this device's previous successful login) to block replay: a code from
 * a step at or before one already consumed is rejected even though it's
 * still inside the drift window — otherwise the same code stays valid and
 * reusable by anyone who saw it for up to ~90 seconds.
 */
export function verifyTotpCode(
  secretBase32: string,
  code: string,
  label = "device",
  lastUsedStep: number | null = null
): TotpVerification {
  const delta = totp(secretBase32, label).validate({ token: code.trim(), window: 1 });
  if (delta === null) return { valid: false };

  const step = currentTotpStep() + delta;
  if (lastUsedStep !== null && step <= lastUsedStep) return { valid: false };

  return { valid: true, step };
}

export const TOTP_PARAMS = {
  issuer: ISSUER,
  algorithm: ALGORITHM,
  digits: DIGITS,
  period: PERIOD,
} as const;
