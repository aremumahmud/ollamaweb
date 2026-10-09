import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fastapiFetch, fastapiJson } from "@/lib/fastapi-client";

type StoredDocument = {
  filename: string;
  text_chunks: number;
  table_chunks: number;
  image_chunks: number;
};

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  const { id, filename } = await params;
  await fastapiFetch(`/documents/${encodeURIComponent(filename)}`, { method: "DELETE" }).catch(
    () => null
  );
  await prisma.document.deleteMany({ where: { filename, patientId: id } });
  return NextResponse.json({ deleted: true });
}

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  const { id, filename } = await params;

  const existing = await prisma.document.findFirst({ where: { filename, patientId: id } });
  if (!existing) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const stored = await fastapiJson<StoredDocument[]>("/documents").catch(() => []);
  const inStore = stored.find((d) => d.filename === filename);
  const hasChunks =
    !!inStore && inStore.text_chunks + inStore.table_chunks + inStore.image_chunks > 0;

  const doc = await prisma.document.update({
    where: { filename },
    data: hasChunks
      ? {
          status: "READY",
          textChunks: inStore.text_chunks,
          tableChunks: inStore.table_chunks,
          imageChunks: inStore.image_chunks,
          errorMessage: null,
        }
      : {
          status: "FAILED",
          errorMessage: "Ingestion was interrupted before any content was stored. Re-upload the file.",
        },
  });

  return NextResponse.json(doc);
}
