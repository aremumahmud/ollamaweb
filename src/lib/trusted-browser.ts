import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const TRUSTED_DEVICE_COOKIE = "nurse_trusted_device";

const FIVE_YEARS_SECONDS = 60 * 60 * 24 * 365 * 5;

export function hashDeviceSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

export function generateDeviceSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Parses the trusted-device cookie out of a raw `Cookie` request header. */
export function readTrustedDeviceCookieFromHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === TRUSTED_DEVICE_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export const trustedDeviceCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: FIVE_YEARS_SECONDS,
  path: "/",
};

/**
 * Server Component / layout guard: signs the nurse out immediately if their
 * browser's trust was revoked (or never granted) — closes the gap where a
 * JWT session outlives a device's approval status.
 */
export async function assertTrustedBrowser(role: string | undefined) {
  if (role !== "NURSE") return;

  const cookieStore = await cookies();
  const secret = cookieStore.get(TRUSTED_DEVICE_COOKIE)?.value;
  if (!secret) redirect("/login");

  const device = await prisma.device.findUnique({
    where: { cookieSecretHash: hashDeviceSecret(secret) },
  });
  if (!device || device.kind !== "BROWSER" || device.status !== "ACTIVE") {
    redirect("/login");
  }
}
