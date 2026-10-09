import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fastapiFetch } from "@/lib/fastapi-client";

const NOTE_UPLOADS_DIR = process.env.NOTE_UPLOADS_DIR ?? "./uploads/notes";
const ALLOWED_DOCUMENT_EXTENSIONS = [".pdf", ".docx"];

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notes = await prisma.note.findMany({
    where: { patientId: id },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(notes);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const authorId = (session?.user as { id?: string } | undefined)?.id;
  if (!authorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData();
  const text = (formData.get("text") as string | null)?.trim() || null;
  const image = formData.get("image") as File | null;
  const document = formData.get("document") as File | null;

  if (!text && !image && !document) {
    return NextResponse.json(
      { error: "Note must have text, an image, or a document" },
      { status: 400 }
    );
  }

  if (document) {
    const ext = document.name.toLowerCase().slice(document.name.lastIndexOf("."));
    if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: "Only PDF or DOCX files are supported" }, { status: 400 });
    }
  }

  let imagePath: string | null = null;
  let imageDescription: string | null = null;
  let documentPath: string | null = null;
  let documentText: string | null = null;
  let visionStatus: "NONE" | "DONE" | "FAILED" = "NONE";

  if (image) {
    await fs.mkdir(NOTE_UPLOADS_DIR, { recursive: true });
    const ext = image.name.split(".").pop() || "jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const destPath = path.join(NOTE_UPLOADS_DIR, filename);
    const buffer = Buffer.from(await image.arrayBuffer());
    await fs.writeFile(destPath, buffer);
    imagePath = `/uploads/notes/${filename}`;

    try {
      const proxyForm = new FormData();
      proxyForm.append("file", new Blob([buffer]), image.name);
      const res = await fastapiFetch("/notes/describe-image", { method: "POST", body: proxyForm });
      const result = await res.json();
      imageDescription = result.description;
      visionStatus = "DONE";
    } catch {
      visionStatus = "FAILED";
    }
  }

  if (document) {
    await fs.mkdir(NOTE_UPLOADS_DIR, { recursive: true });
    const ext = document.name.split(".").pop() || "pdf";
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const destPath = path.join(NOTE_UPLOADS_DIR, filename);
    const buffer = Buffer.from(await document.arrayBuffer());
    await fs.writeFile(destPath, buffer);
    documentPath = `/uploads/notes/${filename}`;

    try {
      const proxyForm = new FormData();
      proxyForm.append("file", new Blob([buffer]), document.name);
      const res = await fastapiFetch("/notes/extract-document", { method: "POST", body: proxyForm });
      const result = await res.json();
      documentText = result.text || null;
    } catch (e) {
      return NextResponse.json(
        { error: `Could not read the document: ${(e as Error).message}` },
        { status: 502 }
      );
    }
  }

  const kind = document ? "DOCUMENT" : text && image ? "MIXED" : image ? "IMAGE" : "TEXT";

  const note = await prisma.note.create({
    data: {
      patientId: id,
      authorId,
      kind,
      text,
      imagePath,
      imageDescription,
      documentPath,
      documentText,
      visionStatus,
    },
  });

  return NextResponse.json(note);
}
