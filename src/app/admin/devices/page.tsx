import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/layout/PageHeader";
import DeviceManager from "@/components/admin/DeviceManager";

export const metadata = { title: "Devices" };

export default async function DevicesPage() {
  const devices = await prisma.device.findMany({
    where: { kind: "PHONE" },
    include: { linkedBrowsers: { orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Devices"
        description="Phones paired with the Care RAG Authenticator app, and the browsers they've vouched for. Nurses need both a trusted browser and a phone code, alongside their password, to sign in."
      />
      <DeviceManager initialDevices={devices} />
    </div>
  );
}
