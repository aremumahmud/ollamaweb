"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  FileStack,
  Loader2,
  RefreshCw,
  SearchX,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/layout/EmptyState";
import CitationChip, { type Citation } from "@/components/ask/CitationChip";

const PdfViewerModal = dynamic(() => import("@/components/pdf/PdfViewerModal"), { ssr: false });

type OasisDocument = {
  id: string;
  filename: string;
  status: "PENDING" | "INGESTING" | "READY" | "FAILED";
  errorMessage: string | null;
  uploadedAt: string;
};

type OasisAnswer = {
  id: string;
  page: number;
  question: string;
  answer: string | null;
  notFound: boolean;
  citations: Citation[];
  status: "PENDING" | "DONE" | "FAILED";
};

type OasisContradiction = {
  id: string;
  questionA: string;
  questionB: string;
  explanation: string;
};

const POLL_MS = 2500;

function displayName(filename: string) {
  return filename.replace(/^\d+-[a-z0-9]+-/, "");
}

function renderAnswer(answer: string, citations: Citation[], onCiteClick: (c: Citation) => void) {
  const parts = answer.split(/(chunk_\d+)/g);
  return parts.map((part, i) => {
    const match = part.match(/^chunk_(\d+)$/);
    if (!match) return <span key={i}>{part}</span>;
    const citation = citations.find((c) => c.marker === Number(match[1]));
    if (!citation) return null;
    return <CitationChip key={i} citation={citation} onClick={onCiteClick} />;
  });
}

export default function OasisPanel({ patientId }: { patientId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [oasisDoc, setOasisDoc] = useState<OasisDocument | null>(null);
  const [answers, setAnswers] = useState<OasisAnswer[]>([]);
  const [contradictions, setContradictions] = useState<OasisContradiction[]>([]);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const loadLatest = useCallback(async () => {
    const res = await fetch(`/api/patients/${patientId}/oasis`);
    const docs: OasisDocument[] = await res.json();
    const latest = docs[0] ?? null;
    setOasisDoc(latest);
    if (latest) {
      const resultsRes = await fetch(`/api/patients/${patientId}/oasis/${latest.id}/results`);
      const results = await resultsRes.json();
      setAnswers(results.answers ?? []);
      setContradictions(results.contradictions ?? []);
    }
    setLoadingInitial(false);
  }, [patientId]);

  useEffect(() => {
    loadLatest();
  }, [loadLatest]);

  const processing = oasisDoc?.status === "INGESTING";

  useEffect(() => {
    if (!processing) return;
    const interval = setInterval(loadLatest, POLL_MS);
    return () => clearInterval(interval);
  }, [processing, loadLatest]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/patients/${patientId}/oasis/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      const doc: OasisDocument = await res.json();
      setOasisDoc(doc);
      setAnswers([]);
      setContradictions([]);
      await startProcessing(doc.id);
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function startProcessing(documentId: string) {
    try {
      const res = await fetch(`/api/patients/${patientId}/oasis/${documentId}/process`, {
        method: "POST",
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Could not start processing");
      toast.success("Processing started", {
        description: "Extracting questions page by page — this can take a while for long forms.",
      });
      await loadLatest();
    } catch (e) {
      toast.error("Could not start processing", { description: (e as Error).message });
    }
  }

  async function removeOasisDoc() {
    if (!oasisDoc) return;
    try {
      const res = await fetch(`/api/patients/${patientId}/oasis/${oasisDoc.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove document");
      setOasisDoc(null);
      setAnswers([]);
      setContradictions([]);
      toast.success("Document removed");
    } catch (e) {
      toast.error("Could not remove document", { description: (e as Error).message });
    }
  }

  if (loadingInitial) {
    return (
      <Card>
        <CardContent className="space-y-2.5">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const pageNumbers = Array.from(new Set(answers.map((a) => a.page))).sort((a, b) => a - b);
  const doneCount = answers.filter((a) => a.status !== "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">OASIS Ask</h2>
          <p className="text-muted-foreground text-xs">
            Upload an OASIS assessment PDF — each page&apos;s questions are extracted and answered
            from this patient&apos;s notes and documents, one page at a time.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
        />
        <Button onClick={() => fileRef.current?.click()} disabled={uploading || processing}>
          {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
          {uploading ? "Uploading…" : "Upload OASIS PDF"}
        </Button>
      </div>

      {!oasisDoc ? (
        <EmptyState
          icon={FileStack}
          title="No OASIS assessment uploaded"
          description="Upload a PDF to extract and answer its questions from this patient's records."
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                <FileStack className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayName(oasisDoc.filename)}</p>
                <p className="text-muted-foreground text-xs">
                  {oasisDoc.status === "INGESTING" &&
                    `Processing — ${doneCount} of ${answers.length || "?"} questions answered so far`}
                  {oasisDoc.status === "READY" && `${answers.length} question(s) answered`}
                  {oasisDoc.status === "FAILED" && (oasisDoc.errorMessage || "Processing failed")}
                  {oasisDoc.status === "PENDING" && "Waiting to start…"}
                </p>
              </div>
              {oasisDoc.status === "INGESTING" && (
                <Loader2 className="text-muted-foreground animate-spin" />
              )}
              {oasisDoc.status !== "INGESTING" && (
                <>
                  <Button variant="outline" size="sm" onClick={() => startProcessing(oasisDoc.id)}>
                    <RefreshCw />
                    Re-run
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={removeOasisDoc}
                  >
                    <Trash2 />
                    Remove
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {oasisDoc.status === "INGESTING" && <Progress value={null} />}

          {contradictions.length > 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-destructive size-4" />
                  <p className="text-destructive text-sm font-semibold">
                    {contradictions.length} potential contradiction
                    {contradictions.length === 1 ? "" : "s"} found
                  </p>
                </div>
                <div className="space-y-3">
                  {contradictions.map((c) => (
                    <div key={c.id} className="border-destructive/30 space-y-1 border-t pt-3 text-sm">
                      <p>
                        <span className="font-medium">Q:</span> {c.questionA}
                      </p>
                      <p>
                        <span className="font-medium">Q:</span> {c.questionB}
                      </p>
                      <p className="text-muted-foreground text-xs italic">{c.explanation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {pageNumbers.map((pageNum) => (
            <div key={pageNum} className="space-y-3">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Page {pageNum}
              </p>
              {answers
                .filter((a) => a.page === pageNum)
                .map((a) => (
                  <Card key={a.id} className="gap-0 py-0">
                    <CardContent className="space-y-3 p-5">
                      <p className="text-sm font-medium">{a.question}</p>
                      {a.status === "PENDING" && (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      )}
                      {a.status === "DONE" &&
                        (a.notFound ? (
                          <div className="flex items-start gap-3">
                            <div className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                              <SearchX className="size-4" />
                            </div>
                            <p className="text-muted-foreground text-sm">
                              Not found in this patient&apos;s notes or documents.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Badge variant="secondary">
                              <Sparkles />
                              Answer
                            </Badge>
                            <p className="text-sm leading-7">
                              {renderAnswer(a.answer ?? "", a.citations, setActiveCitation)}
                            </p>
                          </div>
                        ))}
                      {a.status === "FAILED" && (
                        <p className="text-destructive text-sm">Could not answer this question.</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          ))}
        </div>
      )}

      {activeCitation && (
        <PdfViewerModal citation={activeCitation} onClose={() => setActiveCitation(null)} />
      )}
    </div>
  );
}
