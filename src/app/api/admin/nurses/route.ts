import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const nurses = await prisma.user.findMany({
    where: { role: "NURSE" },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(nurses);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.name || !body.email || !body.password) {
    return NextResponse.json({ error: "name, email, password are required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(body.password, 10);
  const nurse = await prisma.user.create({
    data: { name: body.name, email: body.email, passwordHash, role: "NURSE" },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  return NextResponse.json(nurse);
}
