import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyTotpCode } from "@/lib/totp";
import {
  generateDeviceSecret,
  hashDeviceSecret,
  trustedDeviceCookieOptions,
  TRUSTED_DEVICE_COOKIE,
} from "@/lib/trusted-browser";

// Public — a nurse calls this from an unrecognized browser to request that
// it be trusted. Vouched for by password + a valid phone OTP (the same two
// factors authorize() already requires), so this proves nothing new on its
// own — it just also plants a pending Device row an admin must approve
// before the browser can actually complete a login.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email : null;
  const password = typeof body?.password === "string" ? body.password : null;
  const otp = typeof body?.otp === "string" ? body.otp : null;

  if (!email || !password || !otp) {
    return NextResponse.json({ error: "Email, password, and code are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== "NURSE") {
    return NextResponse.json({ error: "Could not verify your credentials" }, { status: 401 });
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return NextResponse.json({ error: "Could not verify your credentials" }, { status: 401 });
  }

  const activePhones = await prisma.device.findMany({
    where: { kind: "PHONE", status: "ACTIVE", totpSecret: { not: null } },
  });
  let matchedPhone: (typeof activePhones)[number] | undefined;
  let matchedStep: number | undefined;
  for (const device of activePhones) {
    const result = verifyTotpCode(device.totpSecret as string, otp, device.label, device.lastUsedStep);
    if (result.valid) {
      matchedPhone = device;
      matchedStep = result.step;
      break;
    }
  }
  if (!matchedPhone) {
    return NextResponse.json({ error: "Could not verify your phone code" }, { status: 401 });
  }

  const secret = generateDeviceSecret();
  const userAgent = req.headers.get("user-agent");

  await prisma.device.update({
    where: { id: matchedPhone.id },
    data: { lastUsedAt: new Date(), lastUsedStep: matchedStep },
  });

  await prisma.device.create({
    data: {
      kind: "BROWSER",
      status: "PENDING",
      label: `Browser via ${matchedPhone.label}`,
      cookieSecretHash: hashDeviceSecret(secret),
      userAgent,
      linkedPhoneId: matchedPhone.id,
    },
  });

  const response = NextResponse.json({ requested: true });
  response.cookies.set(TRUSTED_DEVICE_COOKIE, secret, trustedDeviceCookieOptions);
  return response;
}
