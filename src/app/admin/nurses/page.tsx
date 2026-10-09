import { Stethoscope } from "lucide-react";

import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/layout/EmptyState";
import AddNurseForm from "@/components/admin/AddNurseForm";
import NurseList from "@/components/admin/NurseList";

export const metadata = { title: "Nurses" };

export default async function NursesPage() {
  const nurses = await prisma.user.findMany({
    where: { role: "NURSE" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Nurses"
        description="Manage nurse accounts with access to patients and care notes."
        actions={<AddNurseForm />}
      />

      {nurses.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No nurse accounts yet"
          description="Create a nurse account so your team can record care notes and ask questions."
        />
      ) : (
        <NurseList nurses={nurses} />
      )}
    </div>
  );
}
