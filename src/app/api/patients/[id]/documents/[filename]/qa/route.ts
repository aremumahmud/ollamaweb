import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  const { id, filename } = await params;

  const document = await prisma.document.findFirst({ where: { filename, patientId: id } });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const results = await prisma.qaResult.findMany({
    where: { documentId: document.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    results: results.map((r) => ({ ...r, citations: JSON.parse(r.citations) })),
  });
}
