import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const questions = await prisma.qaPreset.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(questions);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.question || !body.expectedAnswer) {
    return NextResponse.json(
      { error: "question and expectedAnswer are required" },
      { status: 400 }
    );
  }
  const maxOrder = await prisma.qaPreset.aggregate({ _max: { order: true } });
  const question = await prisma.qaPreset.create({
    data: {
      question: body.question,
      expectedAnswer: body.expectedAnswer,
      order: (maxOrder._max.order ?? 0) + 1,
    },
  });
  return NextResponse.json(question);
}
