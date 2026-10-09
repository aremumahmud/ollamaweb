import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fastapiFetch } from "@/lib/fastapi-client";

export async function POST(req: Request) {
  const session = await auth();
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  await prisma.document.upsert({
    where: { filename: file.name },
    create: {
      filename: file.name,
      storagePath: `uploads/${file.name}`,
      status: "INGESTING",
      uploadedById: session?.user ? (session.user as { id?: string }).id : undefined,
    },
    update: { status: "INGESTING", errorMessage: null },
  });

  try {
    const proxyForm = new FormData();
    proxyForm.append("file", file, file.name);

    const res = await fastapiFetch("/documents/ingest", {
      method: "POST",
      body: proxyForm,
    });
    const result = await res.json();
    return NextResponse.json(result);
  } catch (e) {
    await prisma.document.update({
      where: { filename: file.name },
      data: { status: "FAILED", errorMessage: (e as Error).message },
    });
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
