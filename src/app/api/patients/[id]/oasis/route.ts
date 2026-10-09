import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const documents = await prisma.document.findMany({
    where: { patientId: id, kind: "OASIS" },
    orderBy: { uploadedAt: "desc" },
  });
  return NextResponse.json(documents);
}
