"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type Citation = {
  marker: number;
  content_type: "text" | "table" | "image";
  source: string;
  page: number;
  line_start: number | null;
  line_end: number | null;
  table_index: number | null;
  image_index: number | null;
  snippet: string;
  bbox: number[] | null;
};

function label(citation: Citation): string {
  if (citation.content_type === "text") {
    return `p.${citation.page}, lines ${citation.line_start}-${citation.line_end}`;
  }
  if (citation.content_type === "table") {
    return `p.${citation.page}, Table ${citation.table_index}`;
  }
  return `p.${citation.page}, Image ${citation.image_index}`;
}

export default function CitationChip({
  citation,
  onClick,
}: {
  citation: Citation;
  onClick: (citation: Citation) => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => onClick(citation)}
          className="bg-primary/10 text-primary hover:bg-primary/20 focus-visible:ring-ring/50 mx-0.5 inline-flex cursor-pointer items-center rounded-md px-1.5 py-0.5 align-baseline text-xs font-medium transition-colors outline-none focus-visible:ring-2 dark:bg-primary/15 dark:hover:bg-primary/25"
        >
          [{citation.marker}] {label(citation)}
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        <p className="line-clamp-4">{citation.snippet}</p>
      </TooltipContent>
    </Tooltip>
  );
}
