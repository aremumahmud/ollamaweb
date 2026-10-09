import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAIRING_TTL_MS = 15 * 60 * 1000;

export async function GET() {
  const devices = await prisma.device.findMany({
    where: { kind: "PHONE" },
    include: { linkedBrowsers: { orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(devices);
}

// Only phones are created manually here — browsers only ever arrive via a
// nurse's self-service request (POST /api/devices/request-trust).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }

  const device = await prisma.device.create({
    data: {
      label,
      kind: "PHONE",
      status: "PENDING",
      pairingToken: crypto.randomBytes(16).toString("hex"),
      pairingExpiresAt: new Date(Date.now() + PAIRING_TTL_MS),
    },
  });

  return NextResponse.json(device);
}
