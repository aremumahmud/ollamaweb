import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fastapiJson } from "@/lib/fastapi-client";
import { getResponseTone } from "@/lib/settings";

type AskResponse = { answer: string; citations: unknown[]; not_found: boolean };
type QaJudgeResponse = { verdict: "PASS" | "FAIL" | "UNSURE"; reasoning: string };

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  const { id, filename } = await params;

  const document = await prisma.document.findFirst({ where: { filename, patientId: id } });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  const documentId = document.id;

  const [presets, tone] = await Promise.all([
    prisma.qaPreset.findMany({ orderBy: { order: "asc" } }),
    getResponseTone(),
  ]);

  await prisma.qaResult.deleteMany({ where: { documentId } });

  const results = [];
  for (const preset of presets) {
    try {
      const askResult = await fastapiJson<AskResponse>("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: preset.question,
          source: document.filename,
          ...(tone ? { tone } : {}),
        }),
      });

      const judgeResult = await fastapiJson<QaJudgeResponse>("/qa/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: preset.question,
          expected_answer: preset.expectedAnswer,
          actual_answer: askResult.answer,
          not_found: askResult.not_found,
        }),
      });

      const result = await prisma.qaResult.create({
        data: {
          documentId,
          question: preset.question,
          expectedAnswer: preset.expectedAnswer,
          actualAnswer: askResult.answer,
          verdict: judgeResult.verdict,
          reasoning: judgeResult.reasoning,
          citations: JSON.stringify(askResult.citations),
        },
      });
      results.push({ ...result, citations: askResult.citations });
    } catch (e) {
      const result = await prisma.qaResult.create({
        data: {
          documentId,
          question: preset.question,
          expectedAnswer: preset.expectedAnswer,
          actualAnswer: null,
          verdict: "UNSURE",
          reasoning: `QA check failed: ${(e as Error).message}`,
          citations: "[]",
        },
      });
      results.push({ ...result, citations: [] });
    }
  }

  return NextResponse.json({ results });
}
