import { auth } from "@/auth";
import AskChat from "@/components/ask/AskChat";

export const metadata = { title: "Ask" };

export default async function AskPage() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;

  return <AskChat isAdmin={role === "ADMIN"} />;
}
