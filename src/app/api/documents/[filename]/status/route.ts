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

export async function GET(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const result = await fastapiJson<IngestStatus>(`/documents/${encodeURIComponent(filename)}/status`);

  const doc = await prisma.document.update({
    where: { filename },
    data: {
      status: result.status,
      textChunks: result.text_chunks,
      tableChunks: result.table_chunks,
      imageChunks: result.image_chunks,
      errorMessage: result.error,
    },
  });

  return NextResponse.json(doc);
}
