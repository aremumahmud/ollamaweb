import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const questions = await prisma.presetQuestion.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(questions);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  const maxOrder = await prisma.presetQuestion.aggregate({ _max: { order: true } });
  const question = await prisma.presetQuestion.create({
    data: { text: body.text, order: (maxOrder._max.order ?? 0) + 1 },
  });
  return NextResponse.json(question);
}
