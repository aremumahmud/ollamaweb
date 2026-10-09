import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAIRING_TTL_MS = 15 * 60 * 1000;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;

  if (action === "rename") {
    const label = typeof body.label === "string" ? body.label.trim() : "";
    if (!label) return NextResponse.json({ error: "label is required" }, { status: 400 });
    const device = await prisma.device.update({ where: { id }, data: { label } });
    return NextResponse.json(device);
  }

  if (action === "revoke") {
    const device = await prisma.device.update({ where: { id }, data: { status: "REVOKED" } });
    return NextResponse.json(device);
  }

  // Approve/deny a nurse's pending browser-trust request.
  if (action === "approve") {
    const device = await prisma.device.update({
      where: { id },
      data: { status: "ACTIVE", pairedAt: new Date() },
    });
    return NextResponse.json(device);
  }
  if (action === "deny") {
    const device = await prisma.device.update({ where: { id }, data: { status: "REVOKED" } });
    return NextResponse.json(device);
  }

  if (action === "reactivate") {
    const existing = await prisma.device.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Device not found" }, { status: 404 });

    // Already paired/trusted before — just flip the status back on, no
    // re-pairing needed.
    if (existing.kind === "BROWSER" ? existing.cookieSecretHash : existing.totpSecret) {
      const device = await prisma.device.update({ where: { id }, data: { status: "ACTIVE" } });
      return NextResponse.json(device);
    }
    // Never completed pairing — fall through to issuing a fresh pairing code
    // (phones only — a browser with no cookie has nothing to reactivate into).
  }

  if (action === "reactivate" || action === "regenerate") {
    const device = await prisma.device.update({
      where: { id },
      data: {
        status: "PENDING",
        totpSecret: null,
        pairingToken: crypto.randomBytes(16).toString("hex"),
        pairingExpiresAt: new Date(Date.now() + PAIRING_TTL_MS),
      },
    });
    return NextResponse.json(device);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.device.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
