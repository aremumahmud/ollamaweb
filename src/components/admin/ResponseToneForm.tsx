"use client";

import { useState } from "react";
import { Loader2, MessageSquareText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ResponseToneForm({ initialTone }: { initialTone: string }) {
  const [tone, setTone] = useState(initialTone);
  const [submitting, setSubmitting] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseTone: tone }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Response tone saved");
    } catch (e) {
      toast.error("Could not save", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareText className="size-4" />
          Response tone
        </CardTitle>
        <CardDescription>
          Describe how generated answers should sound. Applied to Ask, trend analysis, and OASIS
          answers. Leave blank for the default neutral tone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="tone">Instructions</Label>
            <Textarea
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="e.g. Warm and reassuring, plain language, avoid clinical jargon."
              rows={4}
            />
          </div>
          <div>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
