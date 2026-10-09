import { auth } from "@/auth";
import AskChat from "@/components/ask/AskChat";

export const metadata = { title: "Patient Ask" };

export default async function PatientAskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  return <AskChat isAdmin={role === "ADMIN"} patientId={id} />;
}
