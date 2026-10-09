import { prisma } from "@/lib/prisma";
import DocumentsList from "@/components/documents/DocumentsList";
import UploadForm from "@/components/documents/UploadForm";

export const metadata = { title: "Patient Library" };

export default async function PatientLibraryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const documents = await prisma.document.findMany({
    where: { patientId: id, kind: "LIBRARY" },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <UploadForm uploadUrl={`/api/patients/${id}/documents/upload`} />
      </div>
      <DocumentsList initialDocuments={documents} canManage patientId={id} />
    </div>
  );
}
