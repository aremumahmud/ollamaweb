"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, ClipboardCheck, FileText, Loader2, Search, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import EmptyState from "@/components/layout/EmptyState";
import CitationChip, { type Citation } from "@/components/ask/CitationChip";

const PdfViewerModal = dynamic(() => import("@/components/pdf/PdfViewerModal"), { ssr: false });

type QaVerdict = "PASS" | "FAIL" | "UNSURE";
type QaResult = {
  id: string;
  question: string;
  expectedAnswer: string;
  actualAnswer: string | null;
  verdict: QaVerdict;
  reasoning: string | null;
  citations: Citation[];
};

function renderQaAnswer(
  answer: string,
  citations: Citation[],
  onCiteClick: (c: Citation) => void
) {
  const parts = answer.split(/(chunk_\d+)/g);
  return parts.map((part, i) => {
    const match = part.match(/^chunk_(\d+)$/);
    if (!match) return <span key={i}>{part}</span>;
    const citation = citations.find((c) => c.marker === Number(match[1]));
    if (!citation) return null;
    return <CitationChip key={i} citation={citation} onClick={onCiteClick} />;
  });
}

function VerdictBadge({ verdict }: { verdict: QaVerdict }) {
  switch (verdict) {
    case "PASS":
      return <Badge variant="success">Pass</Badge>;
    case "FAIL":
      return <Badge variant="destructive">Fail</Badge>;
    default:
      return <Badge variant="outline">Unsure</Badge>;
  }
}

type ChunkCounts = { textChunks: number; tableChunks: number; imageChunks: number };

type Document = ChunkCounts & {
  id: string;
  filename: string;
  status: "PENDING" | "INGESTING" | "READY" | "FAILED";
  errorMessage: string | null;
  uploadedAt: string | Date;
  /** What is already in the vector store right now (live, may be partial). */
  ingested?: ChunkCounts | null;
};

const POLL_MS = 3000;
const STUCK_AFTER_MS = 10 * 60 * 1000;

function chunkSummary(counts: ChunkCounts) {
  return `${counts.textChunks} text · ${counts.tableChunks} tables · ${counts.imageChunks} images`;
}

function elapsedLabel(uploadedAt: string | Date, now: number) {
  const minutes = Math.floor((now - new Date(uploadedAt).getTime()) / 60000);
  if (minutes < 1) return "less than a minute";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function StatusBadge({ status }: { status: Document["status"] }) {
  switch (status) {
    case "READY":
      return <Badge variant="success">Ready</Badge>;
    case "INGESTING":
      return (
        <Badge variant="warning">
          <Loader2 className="animate-spin" />
          Ingesting
        </Badge>
      );
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="secondary">Pending</Badge>;
  }
}

export default function DocumentsList({
  initialDocuments,
  canManage = false,
  patientId,
}: {
  initialDocuments: Document[];
  /** Show resolve/delete actions. Defaults to false (read-only list). */
  canManage?: boolean;
  /** When set, scopes polling/resolve/delete to this patient's documents. */
  patientId?: string;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [query, setQuery] = useState("");
  const [busyFile, setBusyFile] = useState<string | null>(null);
  // Set after mount so elapsed times never differ between server and client render.
  const [now, setNow] = useState<number | null>(null);

  const [qaResultsByFile, setQaResultsByFile] = useState<Record<string, QaResult[]>>({});
  const [qaRunningFile, setQaRunningFile] = useState<string | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  const progressUrl = patientId ? `/api/patients/${patientId}/documents/progress` : "/api/documents/progress";
  const manageUrl = (filename: string) =>
    patientId
      ? `/api/patients/${patientId}/documents/${encodeURIComponent(filename)}`
      : `/api/admin/documents/${encodeURIComponent(filename)}`;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(progressUrl);
      if (!res.ok) return;
      setDocuments(await res.json());
      setNow(Date.now());
    } catch {
      // keep last known state; next poll retries
    }
  }, [progressUrl]);

  const anyInFlight = documents.some((d) => d.status === "INGESTING" || d.status === "PENDING");

  useEffect(() => {
    setNow(Date.now());
    if (!anyInFlight) return;
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [anyInFlight, refresh]);

  async function resolveDocument(doc: Document) {
    setBusyFile(doc.filename);
    try {
      const res = await fetch(manageUrl(doc.filename), {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Could not resolve document");
      const updated: Document = await res.json();
      if (updated.status === "READY") {
        toast.success("Document recovered", {
          description: "Its content was already in the search index — marked as Ready.",
        });
      } else {
        toast.warning("Nothing was ingested", {
          description: "The ingestion was interrupted. Remove the document and upload it again.",
        });
      }
      await refresh();
    } catch (e) {
      toast.error("Recovery failed", { description: (e as Error).message });
    } finally {
      setBusyFile(null);
    }
  }

  async function removeDocument(doc: Document) {
    setBusyFile(doc.filename);
    try {
      const res = await fetch(manageUrl(doc.filename), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Could not remove document");
      setDocuments((prev) => prev.filter((d) => d.filename !== doc.filename));
      toast.success("Document removed", { description: `You can re-upload "${doc.filename}".` });
    } catch (e) {
      toast.error("Remove failed", { description: (e as Error).message });
    } finally {
      setBusyFile(null);
    }
  }

  async function runQa(doc: Document) {
    if (!patientId) return;
    setQaRunningFile(doc.filename);
    try {
      const res = await fetch(
        `/api/patients/${patientId}/documents/${encodeURIComponent(doc.filename)}/qa/run`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("QA run failed");
      const data = await res.json();
      setQaResultsByFile((prev) => ({ ...prev, [doc.filename]: data.results }));
    } catch (e) {
      toast.error("QA run failed", { description: (e as Error).message });
    } finally {
      setQaRunningFile(null);
    }
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description="Upload a PDF to ingest it and start asking questions about its contents."
      />
    );
  }

  const readyCount = documents.filter((d) => d.status === "READY").length;
  const filtered = query.trim()
    ? documents.filter((d) => d.filename.toLowerCase().includes(query.trim().toLowerCase()))
    : documents;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documents…"
          className="pl-9"
          aria-label="Search documents"
        />
      </div>

      {/* Overall progress across the library */}
      {readyCount < documents.length && (
        <div className="space-y-2">
          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>
              {readyCount} of {documents.length} {documents.length === 1 ? "document" : "documents"}{" "}
              ready
            </span>
            <span>{Math.round((readyCount / documents.length) * 100)}%</span>
          </div>
          <Progress value={(readyCount / documents.length) * 100} />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No matches" description="Try a different search." />
      ) : (
      <Card className="divide-y gap-0 overflow-hidden py-0">
        {filtered.map((doc) => {
          const ingesting = doc.status === "INGESTING" || doc.status === "PENDING";
          const stuck =
            ingesting && now !== null && now - new Date(doc.uploadedAt).getTime() > STUCK_AFTER_MS;
          const busy = busyFile === doc.filename;
          const liveCounts = doc.ingested ?? { textChunks: 0, tableChunks: 0, imageChunks: 0 };

          return (
            <div key={doc.id} className="space-y-3 px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <FileText className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.filename}</p>
                  <p className="text-muted-foreground text-xs">
                    {ingesting
                      ? `Ingested so far: ${chunkSummary(liveCounts)}`
                      : chunkSummary(doc)}
                  </p>
                  {doc.errorMessage && (
                    <p className="text-destructive mt-1 text-xs">{doc.errorMessage}</p>
                  )}
                </div>
                <StatusBadge status={doc.status} />
              </div>

              {/* Live ingestion progress */}
              {ingesting && !stuck && (
                <div className="space-y-1.5 pl-13">
                  <Progress value={null} />
                  {now !== null && (
                    <p className="text-muted-foreground text-xs">
                      Processing for {elapsedLabel(doc.uploadedAt, now)}…
                    </p>
                  )}
                </div>
              )}

              {/* Stuck: ingesting for too long */}
              {stuck && (
                <div className="bg-warning/10 space-y-2 rounded-lg p-3 pl-3.5">
                  <p className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    Ingesting for {elapsedLabel(doc.uploadedAt, now!)} — this looks stuck. The
                    ingestion service may have restarted.
                  </p>
                  {canManage && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => resolveDocument(doc)}
                      >
                        {busy ? <Loader2 className="animate-spin" /> : <Wrench />}
                        Check &amp; resolve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={busy}
                        onClick={() => removeDocument(doc)}
                      >
                        <Trash2 />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* QA: check the document against admin-defined preset questions */}
              {doc.status === "READY" && canManage && patientId && (
                <div className="space-y-3 pl-13">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={qaRunningFile === doc.filename}
                    onClick={() => runQa(doc)}
                  >
                    {qaRunningFile === doc.filename ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <ClipboardCheck />
                    )}
                    Run QA
                  </Button>

                  {qaRunningFile === doc.filename && (
                    <div className="space-y-2">
                      <Progress value={null} />
                      <p className="text-muted-foreground text-xs">Running QA questions…</p>
                    </div>
                  )}

                  {qaRunningFile !== doc.filename && qaResultsByFile[doc.filename] && (
                    <div className="space-y-2">
                      {qaResultsByFile[doc.filename].length === 0 ? (
                        <p className="text-muted-foreground text-xs">
                          No QA questions configured yet — add some in admin QA questions.
                        </p>
                      ) : (
                        qaResultsByFile[doc.filename].map((r) => (
                          <div key={r.id} className="bg-muted/40 space-y-1.5 rounded-lg p-3">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-medium">{r.question}</p>
                              <VerdictBadge verdict={r.verdict} />
                            </div>
                            <p className="text-muted-foreground text-xs">
                              Rubric: {r.expectedAnswer}
                            </p>
                            {r.actualAnswer && (
                              <p className="text-sm leading-6">
                                {renderQaAnswer(r.actualAnswer, r.citations, setActiveCitation)}
                              </p>
                            )}
                            {r.reasoning && (
                              <p className="text-muted-foreground text-xs italic">{r.reasoning}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Failed: allow cleanup so it can be re-uploaded */}
              {doc.status === "FAILED" && canManage && (
                <div className="pl-13">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={busy}
                    onClick={() => removeDocument(doc)}
                  >
                    <Trash2 />
                    Remove &amp; re-upload
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </Card>
      )}

      {activeCitation && (
        <PdfViewerModal citation={activeCitation} onClose={() => setActiveCitation(null)} />
      )}
    </div>
  );
}
