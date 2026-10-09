import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl">
        <SearchX className="size-6" />
      </div>
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground text-sm">
          The page you are looking for doesn&apos;t exist or was moved.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
