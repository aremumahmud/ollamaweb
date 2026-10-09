"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Determinate when `value` (0-100) is given; indeterminate (sliding bar)
 * when `value` is undefined/null — for work with no known total.
 */
function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<"div"> & { value?: number | null }) {
  const determinate = typeof value === "number";
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={determinate ? Math.round(value) : undefined}
      className={cn("bg-primary/15 relative h-1.5 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      {determinate ? (
        <div
          className="bg-primary h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      ) : (
        <div className="bg-primary animate-progress-indeterminate absolute inset-y-0 w-1/3 rounded-full" />
      )}
    </div>
  );
}

export { Progress };
