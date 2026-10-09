import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";
import { verifyTotpCode } from "@/lib/totp";
import { hashDeviceSecret, readTrustedDeviceCookieFromHeader } from "@/lib/trusted-browser";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "6-digit code", type: "text" },
      },
      authorize: async (credentials, request) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const otp = credentials?.otp as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        if (user.role === "NURSE") {
          // Factor 1: this browser must carry a cookie for an admin-approved
          // login device. Checked first and fails closed — an unapproved
          // browser is rejected even with a perfectly correct password/OTP,
          // which is the whole point (a code alone doesn't prove *where*
          // it's being typed).
          const cookieSecret = readTrustedDeviceCookieFromHeader(
            request.headers.get("cookie")
          );
          if (!cookieSecret) return null;

          const browserDevice = await prisma.device.findUnique({
            where: { cookieSecretHash: hashDeviceSecret(cookieSecret) },
          });
          if (!browserDevice || browserDevice.kind !== "BROWSER" || browserDevice.status !== "ACTIVE") {
            return null;
          }

          // Factor 2: a valid, not-previously-used rotating code from an
          // admin-paired phone.
          if (!otp || !otp.trim()) return null;

          const activePhones = await prisma.device.findMany({
            where: { kind: "PHONE", status: "ACTIVE", totpSecret: { not: null } },
          });
          let matchedPhone: (typeof activePhones)[number] | undefined;
          let matchedStep: number | undefined;
          for (const device of activePhones) {
            const result = verifyTotpCode(
              device.totpSecret as string,
              otp,
              device.label,
              device.lastUsedStep
            );
            if (result.valid) {
              matchedPhone = device;
              matchedStep = result.step;
              break;
            }
          }
          if (!matchedPhone) return null;

          await prisma.device.update({
            where: { id: browserDevice.id },
            data: { lastUsedAt: new Date() },
          });
          await prisma.device.update({
            where: { id: matchedPhone.id },
            data: { lastUsedAt: new Date(), lastUsedStep: matchedStep },
          });
        }

        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
});
