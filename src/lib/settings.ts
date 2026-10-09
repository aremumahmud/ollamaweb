import { prisma } from "@/lib/prisma";

const SINGLETON_ID = "singleton";

export async function getResponseTone(): Promise<string | undefined> {
  const settings = await prisma.settings.findUnique({ where: { id: SINGLETON_ID } });
  return settings?.responseTone?.trim() || undefined;
}

export async function setResponseTone(responseTone: string): Promise<void> {
  await prisma.settings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, responseTone },
    update: { responseTone },
  });
}
