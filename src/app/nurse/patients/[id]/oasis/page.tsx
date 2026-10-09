import OasisPanel from "@/components/patients/OasisPanel";

export const metadata = { title: "OASIS Ask" };

export default async function PatientOasisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <OasisPanel patientId={id} />;
}
