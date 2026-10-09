import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fastapiJson } from "@/lib/fastapi-client";
import { getResponseTone } from "@/lib/settings";

// Answers one question against a single patient's notes — the building
// block the admin trend-ask page calls once per patient (client-driven,
// same sequential-loop pattern as the Ask page's "Ask all preset
// questions") so it can actually check every patient rather than relying
// on approximate retrieval, and show live per-patient progress.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question : "";
  const patientId = typeof body.patientId === "string" ? body.patientId : "";
  if (!question.trim() || !patientId) {
    return NextResponse.json({ error: "question and patientId are required" }, { status: 400 });
  }

  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const notes = await prisma.note.findMany({
    where: { patientId },
    orderBy: { createdAt: "asc" },
  });
  const tone = await getResponseTone();

  const result = await fastapiJson(`/patients/${encodeURIComponent(patientId)}/answer-question`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      notes: notes.map((n) => ({
        id: n.id,
        created_at: n.createdAt.toISOString().slice(0, 10),
        kind: n.kind,
        text: n.text ?? n.documentText,
        image_description: n.imageDescription,
      })),
      ...(tone ? { tone } : {}),
    }),
  });

  return NextResponse.json({
    patientId: patient.id,
    patientName: patient.fullName,
    ...(result as object),
  });
}
