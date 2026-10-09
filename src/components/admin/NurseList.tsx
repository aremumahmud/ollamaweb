"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import EmptyState from "@/components/layout/EmptyState";

type Nurse = { id: string; name: string; email: string };

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function NurseList({ nurses }: { nurses: Nurse[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return nurses;
    return nurses.filter(
      (n) => n.name.toLowerCase().includes(q) || n.email.toLowerCase().includes(q)
    );
  }, [nurses, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="pl-9"
          aria-label="Search nurses"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matches" description="Try a different search." />
      ) : (
        <Card className="divide-y gap-0 overflow-hidden py-0">
          {filtered.map((nurse) => (
            <div key={nurse.id} className="flex items-center gap-4 px-5 py-4">
              <Avatar className="size-9">
                <AvatarFallback>{initials(nurse.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{nurse.name}</p>
                <p className="text-muted-foreground truncate text-xs">{nurse.email}</p>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
