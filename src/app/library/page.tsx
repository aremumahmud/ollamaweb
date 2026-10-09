import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/layout/PageHeader";
import UploadForm from "@/components/documents/UploadForm";
import DocumentsList from "@/components/documents/DocumentsList";

export const metadata = { title: "Library" };

export default async function LibraryPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAdmin = role === "ADMIN";

  const documents = await prisma.document.findMany({
    where: { patientId: null },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Library"
        description={
          isAdmin
            ? "Every document uploaded here becomes searchable from the Ask page."
            : "Documents available to ask questions about."
        }
        actions={isAdmin ? <UploadForm /> : undefined}
      />
      <DocumentsList initialDocuments={documents} canManage={isAdmin} />
    </div>
  );
}
