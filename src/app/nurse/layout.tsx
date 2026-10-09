import { redirect } from "next/navigation";
import { auth } from "@/auth";
import AppShell from "@/components/layout/AppShell";
import { assertTrustedBrowser } from "@/lib/trusted-browser";

export default async function NurseLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await assertTrustedBrowser((session.user as { role?: string }).role);

  return (
    <AppShell role="NURSE" user={{ name: session.user.name, email: session.user.email }}>
      {children}
    </AppShell>
  );
}
