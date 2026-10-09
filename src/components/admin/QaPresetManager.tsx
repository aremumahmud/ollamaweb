"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ListChecks, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import EmptyState from "@/components/layout/EmptyState";

type QaPreset = { id: string; question: string; expectedAnswer: string; order: number };

const API_BASE = "/api/admin/qa-questions";

export default function QaPresetManager({ initialQuestions }: { initialQuestions: QaPreset[] }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || !expectedAnswer.trim()) return;
    setSubmitting(true);
    await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question.trim(), expectedAnswer: expectedAnswer.trim() }),
    });
    setQuestion("");
    setExpectedAnswer("");
    setSubmitting(false);
    toast.success("QA question added");
    router.refresh();
  }

  async function removeQuestion(q: QaPreset) {
    await fetch(`${API_BASE}/${q.id}`, { method: "DELETE" });
    toast.success("QA question removed");
    router.refresh();
  }

  async function move(q: QaPreset, direction: "up" | "down") {
    const targetIndex = initialQuestions.findIndex((item) => item.id === q.id) + (direction === "up" ? -1 : 1);
    const target = initialQuestions[targetIndex];
    if (!target) return;

    await Promise.all([
      fetch(`${API_BASE}/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: target.order }),
      }),
      fetch(`${API_BASE}/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: q.order }),
      }),
    ]);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addQuestion} className="space-y-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Is the patient's primary diagnosis documented?"
          aria-label="New QA question"
        />
        <Textarea
          value={expectedAnswer}
          onChange={(e) => setExpectedAnswer(e.target.value)}
          placeholder="What must a correct answer contain? e.g. 'Must state a specific ICD diagnosis.'"
          aria-label="Expected answer / rubric"
          rows={2}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting || !question.trim() || !expectedAnswer.trim()}>
            {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
            Add
          </Button>
        </div>
      </form>

      {initialQuestions.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No QA questions yet"
          description="Add rubric-based questions to check uploaded documents against."
        />
      ) : (
        <Card className="divide-y gap-0 overflow-hidden py-0">
          {initialQuestions.map((q, i) => (
            <div key={q.id} className="group flex items-start gap-3 px-5 py-3">
              <span className="text-muted-foreground w-5 shrink-0 pt-0.5 text-xs tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{q.question}</p>
                <p className="text-muted-foreground text-xs">Rubric: {q.expectedAnswer}</p>
              </div>
              <div className="flex items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => move(q, "up")}
                      disabled={i === 0}
                      aria-label="Move up"
                    >
                      <ArrowUp />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Move up</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => move(q, "down")}
                      disabled={i === initialQuestions.length - 1}
                      aria-label="Move down"
                    >
                      <ArrowDown />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Move down</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeQuestion(q)}
                      aria-label="Remove question"
                    >
                      <Trash2 />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove</TooltipContent>
                </Tooltip>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
