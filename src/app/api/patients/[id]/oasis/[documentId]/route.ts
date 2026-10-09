import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const OASIS_UPLOADS_DIR = process.env.OASIS_UPLOADS_DIR ?? "./public/uploads/oasis";

export async function DELETE(
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

  await fs.rm(path.join(OASIS_UPLOADS_DIR, document.filename), { force: true });
  await prisma.document.delete({ where: { id: documentId } });

  return NextResponse.json({ deleted: true });
}
