import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AppShell from "@/components/layout/AppShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <AppShell role="ADMIN" user={{ name: session.user.name, email: session.user.email }}>
      {children}
    </AppShell>
  );
}
