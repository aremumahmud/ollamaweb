import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const question = await prisma.qaPreset.update({
    where: { id },
    data: {
      ...(body.question !== undefined ? { question: body.question } : {}),
      ...(body.expectedAnswer !== undefined ? { expectedAnswer: body.expectedAnswer } : {}),
      ...(body.order !== undefined ? { order: body.order } : {}),
    },
  });
  return NextResponse.json(question);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.qaPreset.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
