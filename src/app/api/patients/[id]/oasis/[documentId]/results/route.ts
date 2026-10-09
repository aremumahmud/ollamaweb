import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id, documentId } = await params;

  const document = await prisma.document.findFirst({
    where: { id: documentId, patientId: id, kind: "OASIS" },
  });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const [answers, contradictions] = await Promise.all([
    prisma.oasisAnswer.findMany({
      where: { documentId },
      orderBy: [{ page: "asc" }, { createdAt: "asc" }],
    }),
    prisma.oasisContradiction.findMany({ where: { documentId }, orderBy: { createdAt: "asc" } }),
  ]);

  return NextResponse.json({
    document,
    answers: answers.map((a) => ({ ...a, citations: JSON.parse(a.citations) })),
    contradictions,
  });
}
