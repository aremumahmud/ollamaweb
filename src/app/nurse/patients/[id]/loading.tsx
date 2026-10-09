import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <div className="flex items-center gap-4 pb-8">
        <Skeleton className="size-12 rounded-full" />
        <div className="grid gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="space-y-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="gap-0 py-0">
            <CardContent className="space-y-2.5 p-5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
