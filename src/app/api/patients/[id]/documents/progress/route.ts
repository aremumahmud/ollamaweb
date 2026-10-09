import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fastapiJson } from "@/lib/fastapi-client";

type IngestStatus = {
  filename: string;
  status: "INGESTING" | "READY" | "FAILED";
  text_chunks: number;
  table_chunks: number;
  image_chunks: number;
  error: string | null;
};

type StoredDocument = {
  filename: string;
  text_chunks: number;
  table_chunks: number;
  image_chunks: number;
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const documents = await prisma.document.findMany({
    where: { patientId: id },
    orderBy: { uploadedAt: "desc" },
  });

  const stored = await fastapiJson<StoredDocument[]>("/documents").catch(() => []);
  const storedByName = new Map(stored.map((d) => [d.filename, d]));

  const refreshed = await Promise.all(
    documents.map(async (doc) => {
      if (doc.status !== "INGESTING" && doc.status !== "PENDING") return doc;
      try {
        const result = await fastapiJson<IngestStatus>(
          `/documents/${encodeURIComponent(doc.filename)}/status`
        );
        return await prisma.document.update({
          where: { filename: doc.filename },
          data: {
            status: result.status,
            textChunks: result.text_chunks,
            tableChunks: result.table_chunks,
            imageChunks: result.image_chunks,
            errorMessage: result.error,
          },
        });
      } catch {
        return doc;
      }
    })
  );

  return NextResponse.json(
    refreshed.map((doc) => {
      const inStore = storedByName.get(doc.filename);
      return {
        ...doc,
        ingested: inStore
          ? {
              textChunks: inStore.text_chunks,
              tableChunks: inStore.table_chunks,
              imageChunks: inStore.image_chunks,
            }
          : null,
      };
    })
  );
}
