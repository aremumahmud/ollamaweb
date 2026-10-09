import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/layout/PageHeader";
import ResponseToneForm from "@/components/admin/ResponseToneForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Controls that apply across Ask, trend analysis, and OASIS answers."
      />
      <ResponseToneForm initialTone={settings?.responseTone ?? ""} />
    </div>
  );
}
