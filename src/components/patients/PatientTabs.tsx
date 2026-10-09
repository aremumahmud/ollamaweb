"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileStack, Library, NotebookPen, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

export default function PatientTabs({ patientId }: { patientId: string }) {
  const pathname = usePathname();
  const base = `/nurse/patients/${patientId}`;

  const tabs = [
    { href: base, label: "Notes", icon: NotebookPen, exact: true },
    { href: `${base}/ask`, label: "Ask", icon: Sparkles },
    { href: `${base}/library`, label: "Library", icon: Library },
    { href: `${base}/oasis`, label: "OASIS Ask", icon: FileStack },
  ];

  return (
    <nav className="mb-8 flex gap-1 border-b" aria-label="Patient sections">
      {tabs.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground border-transparent"
            )}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
