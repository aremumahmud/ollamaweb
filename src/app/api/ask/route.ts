import { NextResponse } from "next/server";
import { fastapiJson } from "@/lib/fastapi-client";
import { getResponseTone } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

type AskRequestBody = {
  question: string;
  source?: string;
  patient_id?: string;
  document_ids?: string[];
  date_from?: string;
  date_to?: string;
};

export async function POST(req: Request) {
  const body: AskRequestBody = await req.json();
  const { document_ids, date_from, date_to, patient_id, ...rest } = body;
  const tone = await getResponseTone();

  const payload: Record<string, unknown> = { ...rest, patient_id, ...(tone ? { tone } : {}) };

  if (patient_id) {
    if (document_ids && document_ids.length > 0) {
      const documents = await prisma.document.findMany({
        where: { id: { in: document_ids }, patientId: patient_id },
        select: { filename: true },
      });
      payload.sources = documents.map((d) => d.filename);
    }

    const notes = await prisma.note.findMany({
      where: {
        patientId: patient_id,
        ...(date_from || date_to
          ? {
              createdAt: {
                ...(date_from ? { gte: new Date(date_from) } : {}),
                ...(date_to ? { lte: new Date(`${date_to}T23:59:59.999Z`) } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "asc" },
    });
    payload.notes = notes.map((n) => ({
      created_at: n.createdAt.toISOString().slice(0, 10),
      kind: n.kind,
      text: n.text ?? n.documentText,
      image_description: n.imageDescription,
    }));
  }

  const result = await fastapiJson("/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return NextResponse.json(result);
}
