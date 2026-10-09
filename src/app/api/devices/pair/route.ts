import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTotpSecret, TOTP_PARAMS } from "@/lib/totp";

// Public — called by the (unauthenticated) companion mobile app during pairing.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : null;
  if (!token) {
    return NextResponse.json({ error: "Missing pairing token" }, { status: 400 });
  }

  const device = await prisma.device.findUnique({ where: { pairingToken: token } });
  if (!device || device.status !== "PENDING") {
    return NextResponse.json({ error: "Invalid or already-used pairing code" }, { status: 404 });
  }
  if (!device.pairingExpiresAt || device.pairingExpiresAt < new Date()) {
    return NextResponse.json({ error: "This pairing code has expired" }, { status: 410 });
  }

  const platform = typeof body?.platform === "string" ? body.platform : null;
  const model = typeof body?.model === "string" ? body.model : null;
  const osVersion = typeof body?.osVersion === "string" ? body.osVersion : null;

  const secret = generateTotpSecret();

  const updated = await prisma.device.update({
    where: { id: device.id },
    data: {
      status: "ACTIVE",
      totpSecret: secret.base32,
      platform,
      model,
      osVersion,
      pairedAt: new Date(),
      pairingToken: null,
      pairingExpiresAt: null,
    },
  });

  return NextResponse.json({
    secret: secret.base32,
    label: updated.label,
    ...TOTP_PARAMS,
  });
}
