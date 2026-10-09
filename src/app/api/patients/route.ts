import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const patients = await prisma.patient.findMany({ orderBy: { fullName: "asc" } });
  return NextResponse.json(patients);
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body.fullName) {
    return NextResponse.json({ error: "fullName is required" }, { status: 400 });
  }
  const patient = await prisma.patient.create({
    data: {
      fullName: body.fullName,
      dob: body.dob ? new Date(body.dob) : null,
      mrn: body.mrn || null,
    },
  });
  return NextResponse.json(patient);
}
