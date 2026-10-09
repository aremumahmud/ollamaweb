"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  AlertCircle,
  ArrowUp,
  CalendarRange,
  ChevronDown,
  CircleStop,
  FileText,
  Library,
  ListChecks,
  Loader2,
  PencilLine,
  PlayCircle,
  SearchX,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/layout/EmptyState";
import UploadForm from "@/components/documents/UploadForm";
import CitationChip, { type Citation } from "./CitationChip";

const PdfViewerModal = dynamic(() => import("@/components/pdf/PdfViewerModal"), { ssr: false });

type AskResponse = {
  answer: string;
  citations: Citation[];
  not_found: boolean;
};

type PresetQuestion = { id: string; text: string };

type BatchItem = {
  question: PresetQuestion;
  status: "pending" | "loading" | "done" | "error";
  result?: AskResponse;
  error?: string;
};

function renderAnswer(answer: string, citations: Citation[], onCiteClick: (c: Citation) => void) {
  const parts = answer.split(/(chunk_\d+)/g);

  return parts.map((part, i) => {
    const match = part.match(/^chunk_(\d+)$/);
    if (!match) return <span key={i}>{part}</span>;

    const marker = Number(match[1]);
    const citation = citations.find((c) => c.marker === marker);
    if (!citation) return null;
    return <CitationChip key={i} citation={citation} onClick={onCiteClick} />;
  });
}

function AnswerBody({
  result,
  onCiteClick,
}: {
  result: AskResponse;
  onCiteClick: (c: Citation) => void;
}) {
  if (result.not_found) {
    return (
      <div className="flex items-start gap-3">
        <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
          <SearchX className="size-4" />
        </div>
        <div className="grid gap-1 pt-0.5">
          <p className="text-sm font-medium">No answer found</p>
          <p className="text-muted-foreground text-sm">{result.answer}</p>
        </div>
      </div>
    );
  }
  return (
    <p className="text-sm leading-7">{renderAnswer(result.answer, result.citations, onCiteClick)}</p>
  );
}

function AnswerSkeleton() {
  return (
    <div className="space-y-2.5">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-11/12" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  );
}

type AskScope = {
  source?: string;
  patientId?: string;
  documentIds?: string[];
  dateFrom?: string;
  dateTo?: string;
};

async function fetchAnswer(question: string, scope: AskScope): Promise<AskResponse> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      ...(scope.source ? { source: scope.source } : {}),
      ...(scope.patientId ? { patient_id: scope.patientId } : {}),
      ...(scope.documentIds && scope.documentIds.length > 0
        ? { document_ids: scope.documentIds }
        : {}),
      ...(scope.dateFrom ? { date_from: scope.dateFrom } : {}),
      ...(scope.dateTo ? { date_to: scope.dateTo } : {}),
    }),
  });
  if (!res.ok) throw new Error("Ask request failed");
  return res.json();
}

const ALL_DOCUMENTS = "__all__";

export default function AskChat({
  isAdmin = false,
  patientId,
}: {
  isAdmin?: boolean;
  /** When set, scopes Ask to only this patient's documents (no scope picker). */
  patientId?: string;
}) {
  const [mode, setMode] = useState<"manual" | "preset">("manual");
  const [question, setQuestion] = useState("");
  const [presetQuestions, setPresetQuestions] = useState<PresetQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [batch, setBatch] = useState<BatchItem[] | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const batchCancelled = useRef(false);

  const [documents, setDocuments] = useState<{ id: string; filename: string }[]>([]);
  const [scope, setScope] = useState<string>(ALL_DOCUMENTS);
  const [patientDocIds, setPatientDocIds] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // Scope the shown answer was produced with (scope may change afterwards).
  const [resultSource, setResultSource] = useState<string | undefined>(undefined);
  const source = patientId ? undefined : scope === ALL_DOCUMENTS ? undefined : scope;
  const askScope: AskScope = patientId
    ? { patientId, documentIds: patientDocIds, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }
    : { source };

  useEffect(() => {
    fetch("/api/preset-questions")
      .then((r) => r.json())
      .then(setPresetQuestions)
      .catch(() => setPresetQuestions([]));
    if (!patientId) {
      fetch("/api/documents")
        .then((r) => r.json())
        .then(setDocuments)
        .catch(() => setDocuments([]));
    } else {
      fetch(`/api/patients/${patientId}/documents`)
        .then((r) => r.json())
        .then(setDocuments)
        .catch(() => setDocuments([]));
    }
  }, [patientId]);

  const busy = loading || batchRunning;

  async function ask(q: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    setBatch(null);
    setResultSource(source);
    try {
      setResult(await fetchAnswer(q, askScope));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function askAll() {
    if (presetQuestions.length === 0 || busy) return;
    batchCancelled.current = false;
    setResult(null);
    setError(null);
    setResultSource(source);
    setBatch(presetQuestions.map((pq) => ({ question: pq, status: "pending" })));
    setBatchRunning(true);

    for (const pq of presetQuestions) {
      if (batchCancelled.current) break;
      setBatch((prev) =>
        prev?.map((item) =>
          item.question.id === pq.id ? { ...item, status: "loading" } : item
        ) ?? null
      );
      try {
        const answer = await fetchAnswer(pq.text, askScope);
        setBatch((prev) =>
          prev?.map((item) =>
            item.question.id === pq.id ? { ...item, status: "done", result: answer } : item
          ) ?? null
        );
      } catch (e) {
        setBatch((prev) =>
          prev?.map((item) =>
            item.question.id === pq.id
              ? { ...item, status: "error", error: (e as Error).message }
              : item
          ) ?? null
        );
      }
    }

    // Anything still pending after a stop stays unanswered; drop the spinners.
    setBatch((prev) =>
      prev?.map((item) => (item.status === "loading" ? { ...item, status: "pending" } : item)) ??
      null
    );
    setBatchRunning(false);
  }

  const answeredCount = batch?.filter((b) => b.status === "done" || b.status === "error").length ?? 0;

  return (
    <div>
      {!patientId && (
        <PageHeader
          title="Ask the documents"
          description="Answers are grounded in your ingested PDFs, with citations you can open."
          actions={isAdmin ? <UploadForm /> : undefined}
        />
      )}
      {patientId && (
        <div className="flex justify-end pb-4">
          <UploadForm uploadUrl={`/api/patients/${patientId}/documents/upload`} />
        </div>
      )}

      <div className="space-y-6">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "manual" | "preset")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="manual">
                <PencilLine />
                Manual
              </TabsTrigger>
              <TabsTrigger value="preset">
                <ListChecks />
                Preset questions
              </TabsTrigger>
            </TabsList>

            {/* Scope: ask across everything or target a single document */}
            {!patientId && (
              <Select value={scope} onValueChange={setScope} disabled={busy}>
                <SelectTrigger
                  size="sm"
                  className="max-w-64"
                  aria-label="Document to search in"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={ALL_DOCUMENTS}>
                    <Library />
                    All documents
                  </SelectItem>
                  {documents.map((doc) => (
                    <SelectItem key={doc.id} value={doc.filename}>
                      <FileText />
                      <span className="max-w-56 truncate">{doc.filename}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Scope for patient Ask: notes are always included; narrow by
                specific documents and/or a date range on top of that. */}
            {patientId && (
              <div className="flex flex-wrap items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={busy} className="max-w-64">
                      <FileText />
                      {patientDocIds.length === 0
                        ? "All documents"
                        : `${patientDocIds.length} document${patientDocIds.length === 1 ? "" : "s"}`}
                      <ChevronDown className="text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-w-72">
                    {documents.length === 0 ? (
                      <div className="text-muted-foreground px-2 py-1.5 text-sm">
                        No documents uploaded yet
                      </div>
                    ) : (
                      documents.map((doc) => (
                        <DropdownMenuCheckboxItem
                          key={doc.id}
                          checked={patientDocIds.includes(doc.id)}
                          onCheckedChange={(checked) =>
                            setPatientDocIds((prev) =>
                              checked ? [...prev, doc.id] : prev.filter((id) => id !== doc.id)
                            )
                          }
                          onSelect={(e) => e.preventDefault()}
                        >
                          <span className="truncate">{doc.filename}</span>
                        </DropdownMenuCheckboxItem>
                      ))
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="flex items-center gap-1.5">
                  <CalendarRange className="text-muted-foreground size-4" />
                  <Input
                    type="date"
                    aria-label="Notes from date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    disabled={busy}
                    className="h-9 w-36"
                  />
                  <span className="text-muted-foreground text-sm">to</span>
                  <Input
                    type="date"
                    aria-label="Notes to date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    disabled={busy}
                    className="h-9 w-36"
                  />
                </div>
              </div>
            )}
          </div>

          <TabsContent value="manual" className="pt-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (question.trim()) ask(question);
              }}
              className="flex gap-2"
            >
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about the ingested documents…"
                aria-label="Question"
                className="h-10"
              />
              <Button type="submit" size="lg" className="px-4" disabled={busy || !question.trim()}>
                {loading ? <Loader2 className="animate-spin" /> : <ArrowUp />}
                <span className="sr-only sm:not-sr-only">Ask</span>
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="preset" className="pt-4">
            {presetQuestions.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="No preset questions yet"
                description={
                  isAdmin
                    ? "Add some from Preset questions in the admin menu."
                    : "Ask your admin to add some common questions here."
                }
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-muted-foreground text-sm">
                    {batchRunning
                      ? `Answering ${answeredCount + 1} of ${presetQuestions.length}…`
                      : `${presetQuestions.length} ${
                          presetQuestions.length === 1 ? "question" : "questions"
                        }`}
                  </p>
                  {batchRunning ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        batchCancelled.current = true;
                      }}
                    >
                      <CircleStop />
                      Stop
                    </Button>
                  ) : (
                    <Button size="sm" onClick={askAll} disabled={busy}>
                      <PlayCircle />
                      Ask all
                    </Button>
                  )}
                </div>

                <Card className="divide-y gap-0 overflow-hidden py-0">
                  {presetQuestions.map((pq) => (
                    <button
                      key={pq.id}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setQuestion(pq.text);
                        ask(pq.text);
                      }}
                      className="hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring/50 flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-3 text-left text-sm transition-colors outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {pq.text}
                      <ArrowUp className="text-muted-foreground size-4 shrink-0 rotate-45" />
                    </button>
                  ))}
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {loading && (
          <Card>
            <CardContent>
              <AnswerSkeleton />
            </CardContent>
          </Card>
        )}

        {error && (
          <div
            role="alert"
            className="text-destructive bg-destructive/10 flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
          >
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {result && (
          <Card>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {!result.not_found && (
                  <Badge variant="secondary">
                    <Sparkles />
                    Answer
                  </Badge>
                )}
                {resultSource && (
                  <Badge variant="outline" className="max-w-72">
                    <FileText />
                    <span className="truncate">{resultSource}</span>
                  </Badge>
                )}
              </div>
              <AnswerBody result={result} onCiteClick={setActiveCitation} />
            </CardContent>
          </Card>
        )}

        {batch && (
          <div className="space-y-4">
            {resultSource && (
              <Badge variant="outline" className="max-w-72">
                <FileText />
                <span className="truncate">Asking only in {resultSource}</span>
              </Badge>
            )}
            {batch.map((item, i) => (
              <Card key={item.question.id} className="gap-0 py-0">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">
                      <span className="text-muted-foreground mr-2 tabular-nums">{i + 1}.</span>
                      {item.question.text}
                    </p>
                    {item.status === "loading" && (
                      <Loader2 className="text-muted-foreground mt-0.5 size-4 shrink-0 animate-spin" />
                    )}
                  </div>

                  {item.status === "loading" && <AnswerSkeleton />}
                  {item.status === "pending" && (
                    <p className="text-muted-foreground text-sm">
                      {batchRunning ? "Waiting…" : "Not answered."}
                    </p>
                  )}
                  {item.status === "error" && (
                    <div
                      role="alert"
                      className="text-destructive bg-destructive/10 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                    >
                      <AlertCircle className="size-4 shrink-0" />
                      {item.error}
                    </div>
                  )}
                  {item.status === "done" && item.result && (
                    <AnswerBody result={item.result} onCiteClick={setActiveCitation} />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {activeCitation && (
        <PdfViewerModal citation={activeCitation} onClose={() => setActiveCitation(null)} />
      )}
    </div>
  );
}
