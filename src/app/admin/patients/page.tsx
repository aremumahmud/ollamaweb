import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/layout/PageHeader";
import AddPatientForm from "@/components/patients/AddPatientForm";
import PatientList from "@/components/patients/PatientList";

export const metadata = { title: "Patients" };

export default async function AdminPatientsPage() {
  const patients = await prisma.patient.findMany({ orderBy: { fullName: "asc" } });

  return (
    <div>
      <PageHeader
        title="Patients"
        description="All patients in the system. Open a profile to review notes and trends."
        actions={<AddPatientForm />}
      />
      <PatientList
        patients={patients}
        emptyDescription="Add your first patient to start recording care notes."
      />
    </div>
  );
}
