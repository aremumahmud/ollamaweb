"use client";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import HighlightBox from "./HighlightBox";
import type { Citation } from "@/components/ask/CitationChip";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const RENDER_SCALE = 1.3;

function PdfLoading() {
  return (
    <div className="text-muted-foreground flex items-center justify-center gap-2 py-24 text-sm">
      <Loader2 className="size-4 animate-spin" />
      Loading page…
    </div>
  );
}

export default function PdfViewerModal({
  citation,
  onClose,
}: {
  citation: Citation;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] gap-4 overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8 text-base">{citation.source}</DialogTitle>
          <DialogDescription>Page {citation.page}</DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 -mx-6 -mb-6 overflow-auto border-t px-6 py-4">
          <div className="relative inline-block rounded-lg border bg-white shadow-xs">
            <Document file={`/api/pdf/${encodeURIComponent(citation.source)}`} loading={<PdfLoading />}>
              <Page pageNumber={citation.page} scale={RENDER_SCALE} loading={<PdfLoading />} />
            </Document>
            {citation.bbox && <HighlightBox bbox={citation.bbox} scale={RENDER_SCALE} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
