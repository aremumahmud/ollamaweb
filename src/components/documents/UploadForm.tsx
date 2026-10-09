"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export default function UploadForm({
  uploadUrl = "/api/admin/documents/upload",
}: {
  uploadUrl?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(uploadUrl, { method: "POST", body: formData });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Upload failed");
      }
      toast.success(`Ingesting "${file.name}"`, {
        description: "It will appear as Ready once processing finishes.",
      });
      router.refresh();
    } catch (e) {
      toast.error("Upload failed", { description: (e as Error).message });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
        {uploading ? "Uploading…" : "Upload PDF"}
      </Button>
    </>
  );
}
