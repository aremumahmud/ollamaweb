import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fastapiJson } from "@/lib/fastapi-client";
import { getResponseTone } from "@/lib/settings";

type OasisPage = { page: number; text: string };
type AskCitation = {
  marker: number;
  content_type: "text" | "table" | "image";
  source: string;
  page: number;
  line_start: number | null;
  line_end: number | null;
  table_index: number | null;
  image_index: number | null;
  snippet: string;
  bbox: number[] | null;
};
type AskResponse = { answer: string; citations: AskCitation[]; not_found: boolean };
type OasisContradiction = { question_a: string; question_b: string; explanation: string };

const OASIS_UPLOADS_DIR = process.env.OASIS_UPLOADS_DIR ?? "./public/uploads/oasis";

// Runs in the background after the HTTP response is sent — this is a
// long-lived Node dev/prod server (not serverless), so a fire-and-forget
// async function keeps running after the handler returns. Every question's
// result is written as soon as it's answered, so the frontend can poll and
// render results page by page instead of waiting for the whole document.
async function processDocument(documentId: string, patientId: string) {
  const tone = await getResponseTone();

  // Given directly as extra grounding context on every question — patient
  // notes aren't embedded/retrievable in the vector store (only ingested
  // documents are), so without this OASIS answers would silently ignore
  // everything recorded in care notes.
  const patientNotes = await prisma.note.findMany({
    where: { patientId },
    orderBy: { createdAt: "asc" },
  });
  const notesPayload = patientNotes.map((n) => ({
    created_at: n.createdAt.toISOString().slice(0, 10),
    kind: n.kind,
    text: n.text ?? n.documentText,
    image_description: n.imageDescription,
  }));

  try {
    const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    const fileBuffer = await fs.readFile(path.join(OASIS_UPLOADS_DIR, document.filename));

    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(fileBuffer)]), document.filename);
    const { pages } = await fastapiJson<{ pages: OasisPage[] }>("/oasis/pages", {
      method: "POST",
      body: form,
    });

    for (const page of pages) {
      const { questions } = await fastapiJson<{ questions: string[] }>("/oasis/extract-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_text: page.text }),
      });

      for (const question of questions) {
        try {
          const result = await fastapiJson<AskResponse>("/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              question,
              patient_id: patientId,
              notes: notesPayload,
              ...(tone ? { tone } : {}),
            }),
          });
          await prisma.oasisAnswer.create({
            data: {
              documentId,
              page: page.page,
              question,
              answer: result.answer,
              notFound: result.not_found,
              citations: JSON.stringify(result.citations),
              status: "DONE",
            },
          });
        } catch (e) {
          await prisma.oasisAnswer.create({
            data: {
              documentId,
              page: page.page,
              question,
              answer: null,
              notFound: true,
              citations: "[]",
              status: "FAILED",
            },
          });
          console.error("OASIS question failed", documentId, page.page, question, e);
        }
      }
    }

    const doneAnswers = await prisma.oasisAnswer.findMany({
      where: { documentId, status: "DONE", notFound: false },
    });
    try {
      const { contradictions } = await fastapiJson<{ contradictions: OasisContradiction[] }>(
        "/oasis/detect-contradictions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            qa_pairs: doneAnswers.map((a) => ({ question: a.question, answer: a.answer })),
          }),
        }
      );
      if (contradictions.length > 0) {
        await prisma.oasisContradiction.createMany({
          data: contradictions.map((c) => ({
            documentId,
            questionA: c.question_a,
            questionB: c.question_b,
            explanation: c.explanation,
          })),
        });
      }
    } catch (e) {
      console.error("OASIS contradiction check failed", documentId, e);
    }

    await prisma.document.update({ where: { id: documentId }, data: { status: "READY" } });
  } catch (e) {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "FAILED", errorMessage: (e as Error).message },
    });
    console.error("OASIS processing failed", documentId, e);
  }
}

export async function POST(
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
  if (document.status === "INGESTING") {
    return NextResponse.json({ error: "Already processing" }, { status: 409 });
  }

  // Clear any previous run's answers/contradictions before reprocessing.
  await prisma.oasisAnswer.deleteMany({ where: { documentId } });
  await prisma.oasisContradiction.deleteMany({ where: { documentId } });
  await prisma.document.update({ where: { id: documentId }, data: { status: "INGESTING" } });

  // Fire-and-forget: don't await, so the request returns immediately while
  // the (potentially several-minute) page-by-page pass continues.
  processDocument(documentId, id).catch((e) => console.error("OASIS background job crashed", e));

  return NextResponse.json({ started: true });
}
