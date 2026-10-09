"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import EmptyState from "@/components/layout/EmptyState";

export type PatientListItem = {
  id: string;
  fullName: string;
  mrn: string | null;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function PatientList({
  patients,
  emptyDescription,
}: {
  patients: PatientListItem[];
  emptyDescription?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) => p.fullName.toLowerCase().includes(q) || p.mrn?.toLowerCase().includes(q)
    );
  }, [patients, query]);

  if (patients.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No patients yet"
        description={emptyDescription ?? "Patients will appear here once they are added."}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or MRN…"
          className="pl-9"
          aria-label="Search patients"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matches" description="Try a different search." />
      ) : (
        <Card className="divide-y gap-0 overflow-hidden py-0">
          {filtered.map((patient) => (
            <Link
              key={patient.id}
              href={`/nurse/patients/${patient.id}`}
              className="hover:bg-muted/50 focus-visible:bg-muted/50 group flex items-center gap-4 px-5 py-4 transition-colors outline-none"
            >
              <Avatar className="size-9">
                <AvatarFallback>{initials(patient.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{patient.fullName}</p>
                <p className="text-muted-foreground text-xs">
                  {patient.mrn ? `MRN ${patient.mrn}` : "No MRN on file"}
                </p>
              </div>
              <ChevronRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
