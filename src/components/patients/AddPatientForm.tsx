"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AddPatientForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [mrn, setMrn] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, dob: dob || null, mrn: mrn || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to add patient");
      toast.success("Patient added", { description: fullName });
      setFullName("");
      setDob("");
      setMrn("");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error("Could not add patient", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a patient</DialogTitle>
          <DialogDescription>Create a patient record for care notes and trends.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="patient-name">Full name</Label>
            <Input
              id="patient-name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Smith"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="patient-dob">Date of birth</Label>
            <Input
              id="patient-dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="patient-mrn">
              MRN <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input id="patient-mrn" value={mrn} onChange={(e) => setMrn(e.target.value)} />
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Add patient
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
