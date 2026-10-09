"use client";

import { useState } from "react";
import {
  AlertCircle,
  CalendarRange,
  Loader2,
  Minus,
  TrendingDown,
  TrendingUp,
  TrendingUpDown,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type TrendCitation = { marker: number; note_id: string; created_at: string };
type TrendPresetAnswer = {
  question: string;
  answer: string;
  not_found: boolean;
  citations: TrendCitation[];
};
type TrendResult = {
  trend: "IMPROVING" | "DECLINING" | "STAGNANT" | "MIXED";
  summary: string;
  citations: TrendCitation[];
  preset_answers?: TrendPresetAnswer[];
};

const TREND_BADGES: Record<
  TrendResult["trend"],
  { variant: "success" | "destructive" | "secondary" | "warning"; icon: React.ReactNode; label: string }
> = {
  IMPROVING: { variant: "success", icon: <TrendingUp />, label: "Improving" },
  DECLINING: { variant: "destructive", icon: <TrendingDown />, label: "Declining" },
  STAGNANT: { variant: "secondary", icon: <Minus />, label: "Stagnant" },
  MIXED: { variant: "warning", icon: <TrendingUpDown />, label: "Mixed" },
};

function renderSummary(summary: string, citations: TrendCitation[]) {
  const parts = summary.split(/(note_\d+)/g);
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

export default function TrendPanel({ patientId }: { patientId: string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrendResult | null>(null);
  // The range the shown result was computed for (inputs may change afterwards).
  const [analyzedRange, setAnalyzedRange] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (from && to && from > to) {
      toast.error("Invalid date range", { description: "The start date is after the end date." });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/patients/${patientId}/analyze-trend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: from || undefined, to: to || undefined }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      setResult(await res.json());
      setAnalyzedRange(
        from || to ? `${from || "the first note"} → ${to || "today"}` : "all notes"
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Care trend</CardTitle>
        <CardDescription>
          Summarize how this patient is progressing across notes, optionally within a date range.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="trend-from" className="text-muted-foreground text-xs">
              From
            </Label>
            <Input
              id="trend-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="h-8 w-fit"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="trend-to" className="text-muted-foreground text-xs">
              To
            </Label>
            <Input
              id="trend-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="h-8 w-fit"
            />
          </div>
          {(from || to) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              Clear
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={analyze} disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            {loading ? "Analyzing…" : result ? "Re-analyze" : "Analyze trend"}
          </Button>
        </div>

        {loading && (
          <div className="space-y-2.5">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="text-destructive bg-destructive/10 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
          >
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {result && !loading && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={TREND_BADGES[result.trend].variant}>
                {TREND_BADGES[result.trend].icon}
                {TREND_BADGES[result.trend].label}
              </Badge>
              {analyzedRange && (
                <Badge variant="outline">
                  <CalendarRange />
                  {analyzedRange}
                </Badge>
              )}
            </div>
            <p className="text-sm leading-7">{renderSummary(result.summary, result.citations)}</p>

            {result.preset_answers && result.preset_answers.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-muted-foreground text-xs font-medium">
                  Preset questions ({result.preset_answers.length})
                </p>
                <div className="divide-y rounded-lg border">
                  {result.preset_answers.map((pa, i) => (
                    <div key={i} className="space-y-1 px-4 py-3">
                      <p className="text-sm font-medium">
                        <span className="text-muted-foreground mr-1.5 tabular-nums">{i + 1}.</span>
                        {pa.question}
                      </p>
                      <p
                        className={`text-sm leading-6 ${pa.not_found ? "text-muted-foreground italic" : ""}`}
                      >
                        {pa.not_found ? pa.answer : renderSummary(pa.answer, pa.citations)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
