import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const OASIS_UPLOADS_DIR = process.env.OASIS_UPLOADS_DIR ?? "./public/uploads/oasis";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const uploadedById = (session?.user as { id?: string } | undefined)?.id;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }

  await fs.mkdir(OASIS_UPLOADS_DIR, { recursive: true });
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
  const destPath = path.join(OASIS_UPLOADS_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(destPath, buffer);

  const document = await prisma.document.create({
    data: {
      filename,
      storagePath: `/uploads/oasis/${filename}`,
      patientId: id,
      kind: "OASIS",
      status: "PENDING",
      uploadedById,
    },
  });

  return NextResponse.json(document);
}
