import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/layout/PageHeader";
import PatientList from "@/components/patients/PatientList";

export const metadata = { title: "Patients" };

export default async function NursePatientsPage() {
  const patients = await prisma.patient.findMany({ orderBy: { fullName: "asc" } });

  return (
    <div>
      <PageHeader
        title="Patients"
        description="Open a patient to review their care notes and record new ones."
      />
      <PatientList
        patients={patients}
        emptyDescription="An administrator can add patients from the admin console."
      />
    </div>
  );
}
