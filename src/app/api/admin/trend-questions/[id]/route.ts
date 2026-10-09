import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const question = await prisma.trendPresetQuestion.update({
    where: { id },
    data: {
      ...(body.text !== undefined ? { text: body.text } : {}),
      ...(body.order !== undefined ? { order: body.order } : {}),
    },
  });
  return NextResponse.json(question);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.trendPresetQuestion.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
