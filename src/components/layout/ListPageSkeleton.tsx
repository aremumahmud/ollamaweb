import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ListPageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-4 pb-8">
        <div className="grid gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <Card className="divide-y gap-0 overflow-hidden py-0">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="size-9 rounded-lg" />
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-32 max-w-full" />
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
