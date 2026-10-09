import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Documents that are ready to be asked about (used by the Ask page scope picker).
export async function GET() {
  const documents = await prisma.document.findMany({
    where: { status: "READY", patientId: null },
    select: { id: true, filename: true },
    orderBy: { filename: "asc" },
  });
  return NextResponse.json(documents);
}
