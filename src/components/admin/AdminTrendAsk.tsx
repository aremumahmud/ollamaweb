"use client";

import { useRef, useState } from "react";
import { AlertCircle, CircleStop, Loader2, Search, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

type TrendCitation = { marker: number; note_id: string; created_at: string };
type PatientResult = {
  patientId: string;
  patientName: string;
  status: "pending" | "loading" | "done" | "error";
  answer?: string;
  not_found?: boolean;
  citations?: TrendCitation[];
  error?: string;
};

function renderAnswer(answer: string, citations: TrendCitation[]) {
  const parts = answer.split(/(note_\d+)/g);
  return parts.map((part, i) => {
    const match = part.match(/^note_(\d+)$/);
    if (!match) return <span key={i}>{part}</span>;
    const citation = citations.find((c) => c.marker === Number(match[1]));
    if (!citation) return null;
    return (
      <span
        key={i}
        className="bg-secondary text-secondary-foreground mx-0.5 inline-flex items-center rounded-md px-1.5 py-0.5 align-baseline text-xs font-medium"
      >
        note dated {citation.created_at}
      </span>
    );
  });
}

export default function AdminTrendAsk() {
  const [question, setQuestion] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<PatientResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelled = useRef(false);

  async function scanAllPatients(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || running) return;

    setError(null);
    cancelled.current = false;
    setRunning(true);

    let patients: { id: string; fullName: string }[];
    try {
      const res = await fetch("/api/patients");
      patients = await res.json();
    } catch {
      setError("Could not load the patient list.");
      setRunning(false);
      return;
    }

    setResults(
      patients.map((p) => ({ patientId: p.id, patientName: p.fullName, status: "pending" }))
    );

    for (const patient of patients) {
      if (cancelled.current) break;
      setResults((prev) =>
        prev?.map((r) => (r.patientId === patient.id ? { ...r, status: "loading" } : r)) ?? null
      );
      try {
        const res = await fetch("/api/admin/trends/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, patientId: patient.id }),
        });
        if (!res.ok) throw new Error("Request failed");
        const data = await res.json();
        setResults((prev) =>
          prev?.map((r) =>
            r.patientId === patient.id
              ? {
                  ...r,
                  status: "done",
                  answer: data.answer,
                  not_found: data.not_found,
                  citations: data.citations,
                }
              : r
          ) ?? null
        );
      } catch (e) {
        setResults((prev) =>
          prev?.map((r) =>
            r.patientId === patient.id
              ? { ...r, status: "error", error: (e as Error).message }
              : r
          ) ?? null
        );
      }
    }

    setResults((prev) =>
      prev?.map((r) => (r.status === "loading" ? { ...r, status: "pending" } : r)) ?? null
    );
    setRunning(false);
  }

  const checkedCount = results?.filter((r) => r.status === "done" || r.status === "error").length ?? 0;
  const matches = results?.filter((r) => r.status === "done" && r.not_found === false) ?? [];
  const allChecked = results != null && checkedCount === results.length;

  return (
    <div className="space-y-6">
      <form onSubmit={scanAllPatients} className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder='e.g. "Did the patient show signs of knee pain?"'
          aria-label="Trend question"
          className="h-10"
          disabled={running}
        />
        {running ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => {
              cancelled.current = true;
            }}
          >
            <CircleStop />
            Stop
          </Button>
        ) : (
          <Button type="submit" size="lg" disabled={!question.trim()}>
            <Search />
            Scan all patients
          </Button>
        )}
      </form>

      {error && (
        <div
          role="alert"
          className="text-destructive bg-destructive/10 flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
        >
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {results && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={allChecked ? "success" : "secondary"}>
              <TrendingUp />
              {allChecked
                ? `${matches.length} of ${results.length} patients match`
                : `Checking ${checkedCount + 1} of ${results.length}…`}
            </Badge>
          </div>

          <div className="space-y-3">
            {results.map((r) => (
              <Card key={r.patientId} className="gap-0 py-0">
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <a
                      href={`/nurse/patients/${r.patientId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {r.patientName}
                    </a>
                    {r.status === "loading" && (
                      <Loader2 className="text-muted-foreground size-4 animate-spin" />
                    )}
                    {r.status === "done" && (
                      <Badge variant={r.not_found ? "secondary" : "success"}>
                        {r.not_found ? "No match" : "Match"}
                      </Badge>
                    )}
                    {r.status === "error" && <Badge variant="destructive">Error</Badge>}
                  </div>
                  {r.status === "loading" && (
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3.5 w-2/3" />
                    </div>
                  )}
                  {r.status === "done" && !r.not_found && r.answer && (
                    <p className="text-sm leading-6">
                      {renderAnswer(r.answer, r.citations ?? [])}
                    </p>
                  )}
                  {r.status === "error" && (
                    <p className="text-destructive text-xs">{r.error}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
