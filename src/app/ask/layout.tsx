import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AppShell, { type AppRole } from "@/components/layout/AppShell";
import { assertTrustedBrowser } from "@/lib/trusted-browser";

export default async function AskLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = ((session.user as { role?: string }).role === "NURSE" ? "NURSE" : "ADMIN") as AppRole;
  await assertTrustedBrowser(role);

  return (
    <AppShell role={role} user={{ name: session.user.name, email: session.user.email }}>
      {children}
    </AppShell>
  );
}
