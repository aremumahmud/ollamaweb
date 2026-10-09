"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ListChecks, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import EmptyState from "@/components/layout/EmptyState";

type PresetQuestion = { id: string; text: string; order: number };

export default function PresetQuestionManager({
  initialQuestions,
  apiBase = "/api/admin/preset-questions",
}: {
  initialQuestions: PresetQuestion[];
  /** Base path for the CRUD API — swap to reuse this manager for a different list. */
  apiBase?: string;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim() }),
    });
    setText("");
    setSubmitting(false);
    toast.success("Preset question added");
    router.refresh();
  }

  async function removeQuestion(question: PresetQuestion) {
    await fetch(`${apiBase}/${question.id}`, { method: "DELETE" });
    toast.success("Preset question removed");
    router.refresh();
  }

  async function move(question: PresetQuestion, direction: "up" | "down") {
    const targetIndex =
      initialQuestions.findIndex((q) => q.id === question.id) + (direction === "up" ? -1 : 1);
    const target = initialQuestions[targetIndex];
    if (!target) return;

    await Promise.all([
      fetch(`${apiBase}/${question.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: target.order }),
      }),
      fetch(`${apiBase}/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: question.order }),
      }),
    ]);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addQuestion} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. What are the discharge criteria?"
          aria-label="New preset question"
        />
        <Button type="submit" disabled={submitting || !text.trim()}>
          {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
          Add
        </Button>
      </form>

      {initialQuestions.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No preset questions yet"
          description="Add common questions so nurses can ask them with a single click."
        />
      ) : (
        <Card className="divide-y gap-0 overflow-hidden py-0">
          {initialQuestions.map((question, i) => (
            <div key={question.id} className="group flex items-center gap-3 px-5 py-3">
              <span className="text-muted-foreground w-5 shrink-0 text-xs tabular-nums">
                {i + 1}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm">{question.text}</p>
              <div className="flex items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => move(question, "up")}
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
                      onClick={() => move(question, "down")}
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
                      onClick={() => removeQuestion(question)}
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
