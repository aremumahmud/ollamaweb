import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fastapiFetch, fastapiJson } from "@/lib/fastapi-client";

type StoredDocument = {
  filename: string;
  text_chunks: number;
  table_chunks: number;
  image_chunks: number;
};

export async function DELETE(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  // The backend may have lost this file (e.g. it restarted mid-ingest); still
  // remove our record so the user can re-upload.
  await fastapiFetch(`/documents/${encodeURIComponent(filename)}`, { method: "DELETE" }).catch(
    () => null
  );
  await prisma.document.delete({ where: { filename } }).catch(() => null);
  return NextResponse.json({ deleted: true });
}

// Recover a document stuck in INGESTING after the ingestion service lost its
// job state: if its chunks made it into the vector store, mark it READY;
// otherwise mark it FAILED so the user knows to re-upload.
export async function PATCH(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

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
