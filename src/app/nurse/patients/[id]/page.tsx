import Image from "next/image";
import { notFound } from "next/navigation";
import { FileText, NotebookPen } from "lucide-react";

import { prisma } from "@/lib/prisma";
import NoteComposer from "@/components/patients/NoteComposer";
import TrendPanel from "@/components/patients/TrendPanel";
import EmptyState from "@/components/layout/EmptyState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function PatientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) notFound();

  const notes = await prisma.note.findMany({
    where: { patientId: id },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-8">
      <TrendPanel patientId={id} />

      <NoteComposer patientId={id} />

      <div>
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-sm font-semibold">Care notes</h2>
          {notes.length > 0 && (
            <span className="text-muted-foreground text-xs">
              {notes.length} {notes.length === 1 ? "note" : "notes"}
            </span>
          )}
        </div>

        {notes.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title="No notes yet"
            description="Notes recorded for this patient will appear here in chronological order."
          />
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <Card key={note.id} className="gap-0 py-0">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-6">
                      <AvatarFallback className="text-[10px]">
                        {initials(note.author.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{note.author.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {dateFormat.format(note.createdAt)}
                    </span>
                  </div>
                  {(note.text || note.imagePath || note.documentPath) && (
                    <Separator className="my-3.5" />
                  )}
                  {note.text && (
                    <p className="text-sm leading-6 whitespace-pre-wrap">{note.text}</p>
                  )}
                  {note.imagePath && (
                    <div className="mt-3">
                      <Image
                        src={note.imagePath}
                        alt="Note attachment"
                        width={300}
                        height={200}
                        className="rounded-lg border object-cover"
                        unoptimized
                      />
                      {note.visionStatus === "PENDING" && (
                        <p className="text-muted-foreground mt-2 text-xs">Analyzing image…</p>
                      )}
                    </div>
                  )}
                  {note.documentPath && (
                    <div className="mt-1">
                      <a
                        href={note.documentPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs underline underline-offset-2"
                      >
                        <FileText className="size-3.5" />
                        View attached document
                      </a>
                      {note.documentText && (
                        <p className="text-sm leading-6 whitespace-pre-wrap mt-2 line-clamp-6">
                          {note.documentText}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
