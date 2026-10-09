import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import PatientTabs from "@/components/patients/PatientTabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default async function PatientLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) notFound();

  return (
    <div>
      <div className="flex items-center gap-4 pb-6">
        <Avatar className="size-12">
          <AvatarFallback className="text-sm">{initials(patient.fullName)}</AvatarFallback>
        </Avatar>
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{patient.fullName}</h1>
          <div className="flex items-center gap-2">
            {patient.mrn ? (
              <Badge variant="secondary">MRN {patient.mrn}</Badge>
            ) : (
              <span className="text-muted-foreground text-sm">No MRN on file</span>
            )}
          </div>
        </div>
      </div>

      <PatientTabs patientId={id} />

      {children}
    </div>
  );
}
