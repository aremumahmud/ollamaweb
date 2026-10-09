import { fastapiFetch } from "@/lib/fastapi-client";

export async function GET(_req: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  const res = await fastapiFetch(`/files/${encodeURIComponent(filename)}`);
  return new Response(res.body, {
    headers: { "Content-Type": "application/pdf" },
  });
}
