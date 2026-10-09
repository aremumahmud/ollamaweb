import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fastapiJson } from "@/lib/fastapi-client";
import { getResponseTone } from "@/lib/settings";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const from = typeof body.from === "string" && body.from ? new Date(body.from) : null;
  const to = typeof body.to === "string" && body.to ? new Date(`${body.to}T23:59:59.999`) : null;

  const notes = await prisma.note.findMany({
    where: {
      patientId: id,
      ...(from || to
        ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  const presetQuestions = await prisma.trendPresetQuestion.findMany({ orderBy: { order: "asc" } });

  if (notes.length === 0) {
    return NextResponse.json({
      trend: "STAGNANT",
      summary:
        from || to
          ? "There are no notes in the selected date range."
          : "There are no notes for this patient yet.",
      citations: [],
      preset_answers: presetQuestions.map((q) => ({
        question: q.text,
        answer: "Not found in the patient's notes.",
        not_found: true,
        citations: [],
      })),
    });
  }

  const tone = await getResponseTone();

  const payload = {
    notes: notes.map((n) => ({
      id: n.id,
      created_at: n.createdAt.toISOString().slice(0, 10),
      kind: n.kind,
      // Document-kind notes carry their extracted text in documentText
      // rather than text — fold it into the same field the backend reads.
      text: n.text ?? n.documentText,
      image_description: n.imageDescription,
    })),
    preset_questions: presetQuestions.map((q) => q.text),
    ...(tone ? { tone } : {}),
  };

  const result = await fastapiJson("/patients/" + encodeURIComponent(id) + "/analyze-trend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return NextResponse.json(result);
}
