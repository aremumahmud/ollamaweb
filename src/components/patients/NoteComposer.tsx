"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function NoteComposer({ patientId }: { patientId: string }) {
  const router = useRouter();
  const imageRef = useRef<HTMLInputElement>(null);
  const documentRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [document, setDocument] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasAttachment = !!image || !!document;

  function clearAttachments() {
    setImage(null);
    setDocument(null);
    if (imageRef.current) imageRef.current.value = "";
    if (documentRef.current) documentRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !hasAttachment) return;
    setSubmitting(true);

    const formData = new FormData();
    if (text.trim()) formData.append("text", text.trim());
    if (image) formData.append("image", image);
    if (document) formData.append("document", document);

    try {
      const res = await fetch(`/api/patients/${patientId}/notes`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to save note");
      setText("");
      clearAttachments();
      toast.success("Note added");
      router.refresh();
    } catch (e) {
      toast.error("Could not save note", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="gap-0 py-0">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="grid gap-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a care note, or attach a PDF/DOCX instead…"
            rows={3}
            className="min-h-20 resize-none border-0 p-1 shadow-none focus-visible:ring-0"
            aria-label="Care note"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              />
              <input
                ref={documentRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
              />

              {image && (
                <div className="bg-muted flex min-w-0 items-center gap-1.5 rounded-md py-1 pr-1 pl-2.5">
                  <span className="text-muted-foreground max-w-48 truncate text-xs">
                    {image.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-5"
                    aria-label="Remove image"
                    onClick={() => {
                      setImage(null);
                      if (imageRef.current) imageRef.current.value = "";
                    }}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              )}
              {document && (
                <div className="bg-muted flex min-w-0 items-center gap-1.5 rounded-md py-1 pr-1 pl-2.5">
                  <span className="text-muted-foreground max-w-48 truncate text-xs">
                    {document.name}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-5"
                    aria-label="Remove document"
                    onClick={() => {
                      setDocument(null);
                      if (documentRef.current) documentRef.current.value = "";
                    }}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              )}
              {!hasAttachment && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => imageRef.current?.click()}
                  >
                    <ImagePlus />
                    Attach image
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => documentRef.current?.click()}
                  >
                    <FileText />
                    Attach PDF/DOCX
                  </Button>
                </>
              )}
            </div>
            <Button type="submit" size="sm" disabled={submitting || (!text.trim() && !hasAttachment)}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? "Saving…" : "Add note"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
