import { NextResponse } from "next/server";
import { getResponseTone, setResponseTone } from "@/lib/settings";

export async function GET() {
  const responseTone = (await getResponseTone()) ?? "";
  return NextResponse.json({ responseTone });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const responseTone = typeof body.responseTone === "string" ? body.responseTone : "";
  await setResponseTone(responseTone);
  return NextResponse.json({ responseTone });
}
