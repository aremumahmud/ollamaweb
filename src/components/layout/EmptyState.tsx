import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-6 py-14 text-center",
        className
      )}
    >
      <div className="bg-muted text-muted-foreground mb-2 flex size-10 items-center justify-center rounded-lg">
        <Icon className="size-5" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
