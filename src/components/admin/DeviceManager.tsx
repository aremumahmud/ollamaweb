"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import {
  Check,
  Copy,
  Laptop,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Smartphone,
  Trash2,
  Undo2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import EmptyState from "@/components/layout/EmptyState";

type DeviceStatus = "PENDING" | "ACTIVE" | "REVOKED";

type BrowserDevice = {
  id: string;
  label: string;
  status: DeviceStatus;
  userAgent: string | null;
  lastUsedAt: string | Date | null;
  createdAt: string | Date;
};

type PhoneDevice = {
  id: string;
  label: string;
  status: DeviceStatus;
  platform: string | null;
  model: string | null;
  osVersion: string | null;
  pairingToken: string | null;
  pairingExpiresAt: string | Date | null;
  pairedAt: string | Date | null;
  lastUsedAt: string | Date | null;
  createdAt: string | Date;
  linkedBrowsers: BrowserDevice[];
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatSpecs(device: PhoneDevice): string | null {
  const parts = [device.model, device.platform && device.osVersion ? `${device.platform} ${device.osVersion}` : device.platform]
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function StatusBadge({ status, expired }: { status: DeviceStatus; expired?: boolean }) {
  if (status === "PENDING") {
    return <Badge variant={expired ? "destructive" : "warning"}>{expired ? "Expired" : "Pending"}</Badge>;
  }
  if (status === "ACTIVE") return <Badge variant="success">Active</Badge>;
  return <Badge variant="secondary">Revoked</Badge>;
}

function PairingCode({ token }: { token: string }) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    // The admin panel is only ever reached locally now (blocked from the
    // public tunnel in src/proxy.ts), so window.location.origin would embed
    // "http://localhost:3000" — unreachable by a phone off the LAN. Use the
    // configured public URL instead when one is set (e.g. the current
    // Cloudflare Tunnel hostname); otherwise fall back to the origin, which
    // is still correct for same-network pairing.
    const server = process.env.NEXT_PUBLIC_PAIRING_SERVER_URL || window.location.origin;
    const payload = JSON.stringify({ server, token });
    QRCode.toDataURL(payload, { margin: 1, width: 220 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [token]);

  return (
    <div className="flex flex-col items-center gap-4">
      {qrDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrDataUrl}
          alt="Pairing QR code"
          width={220}
          height={220}
          className="rounded-lg border"
        />
      ) : (
        <div className="bg-muted flex size-[220px] items-center justify-center rounded-lg">
          <Loader2 className="text-muted-foreground animate-spin" />
        </div>
      )}
      <div className="flex w-full items-center gap-2">
        <code className="bg-muted flex-1 truncate rounded-md px-3 py-2 text-xs">{token}</code>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Copy pairing code"
          onClick={() => {
            navigator.clipboard.writeText(token);
            toast.success("Code copied");
          }}
        >
          <Copy />
        </Button>
      </div>
      <p className="text-muted-foreground text-center text-xs">
        Scan this in the Care RAG Authenticator app, or enter the code manually. Expires in 15
        minutes.
      </p>
    </div>
  );
}

function AddDeviceDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pairingToken, setPairingToken] = useState<string | null>(null);

  async function createDevice(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create device");
      const device: PhoneDevice = await res.json();
      setPairingToken(device.pairingToken);
      router.refresh();
    } catch (e) {
      toast.error("Could not create device", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  function reset(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setLabel("");
      setPairingToken(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add phone
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        {pairingToken ? (
          <>
            <DialogHeader>
              <DialogTitle>Pair this phone</DialogTitle>
              <DialogDescription>
                Open the Care RAG Authenticator app on the phone and scan the code below.
              </DialogDescription>
            </DialogHeader>
            <PairingCode token={pairingToken} />
            <DialogFooter>
              <Button onClick={() => reset(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add a phone</DialogTitle>
              <DialogDescription>
                Name the phone so you can recognize it later, e.g. &quot;Ward A Phone&quot;. Its
                model and OS will be captured automatically once paired.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createDevice} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="device-label">Label</Label>
                <Input
                  id="device-label"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ward A Phone"
                />
              </div>
              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => reset(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || !label.trim()}>
                  {submitting && <Loader2 className="animate-spin" />}
                  Generate pairing code
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ShowPairingDialog({ device }: { device: PhoneDevice }) {
  const [open, setOpen] = useState(false);
  if (!device.pairingToken) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setOpen(true)}>
          <Smartphone />
          Show pairing code
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pair &quot;{device.label}&quot;</DialogTitle>
          <DialogDescription>
            Open the Care RAG Authenticator app on the phone and scan the code below.
          </DialogDescription>
        </DialogHeader>
        <PairingCode token={device.pairingToken} />
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({ deviceId, currentLabel }: { deviceId: string; currentLabel: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(currentLabel);
  const [submitting, setSubmitting] = useState(false);

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/devices/${deviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", label }),
      });
      if (!res.ok) throw new Error("Failed to rename device");
      toast.success("Device renamed");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error("Could not rename device", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setOpen(true)}>
          Rename
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename device</DialogTitle>
        </DialogHeader>
        <form onSubmit={rename} className="grid gap-4">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} required />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !label.trim()}>
              {submitting && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function timeAgo(date: string | Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return dateFormat.format(new Date(date));
}

export default function DeviceManager({ initialDevices }: { initialDevices: PhoneDevice[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filteredDevices = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialDevices;
    return initialDevices.filter((phone) => {
      const specs = formatSpecs(phone) ?? "";
      return phone.label.toLowerCase().includes(q) || specs.toLowerCase().includes(q);
    });
  }, [initialDevices, query]);

  async function runAction(deviceId: string, action: string, successMessage: string) {
    setBusyId(deviceId);
    try {
      const res = await fetch(`/api/admin/devices/${deviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Action failed");
      toast.success(successMessage);
      router.refresh();
    } catch (e) {
      toast.error("Something went wrong", { description: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  }

  async function removeDevice(deviceId: string) {
    setBusyId(deviceId);
    try {
      const res = await fetch(`/api/admin/devices/${deviceId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete device");
      toast.success("Device removed");
      router.refresh();
    } catch (e) {
      toast.error("Could not remove device", { description: (e as Error).message });
    } finally {
      setBusyId(null);
    }
  }

  const pendingApprovals = initialDevices.flatMap((phone) =>
    phone.linkedBrowsers
      .filter((b) => b.status === "PENDING")
      .map((browser) => ({ browser, phone }))
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <AddDeviceDialog />
      </div>

      {pendingApprovals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">
            Pending browser approvals ({pendingApprovals.length})
          </h2>
          <Card className="divide-y gap-0 overflow-hidden py-0">
            {pendingApprovals.map(({ browser, phone }) => (
              <div key={browser.id} className="flex items-center gap-4 px-5 py-4">
                <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Laptop className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    Requested via {phone.label}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {browser.userAgent ?? "Unknown browser"} · {timeAgo(browser.createdAt)}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={busyId === browser.id}
                  onClick={() => runAction(browser.id, "approve", "Browser approved")}
                >
                  {busyId === browser.id ? <Loader2 className="animate-spin" /> : <Check />}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={busyId === browser.id}
                  onClick={() => runAction(browser.id, "deny", "Request denied")}
                >
                  <X />
                  Deny
                </Button>
              </div>
            ))}
          </Card>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Phones</h2>
        {initialDevices.length === 0 ? (
          <EmptyState
            icon={Smartphone}
            title="No phones yet"
            description="Add a phone and pair it with the Care RAG Authenticator app so nurses can sign in."
          />
        ) : (
          <>
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search phones…"
                className="pl-9"
                aria-label="Search phones"
              />
            </div>
            {filteredDevices.length === 0 ? (
              <EmptyState icon={Search} title="No matches" description="Try a different search." />
            ) : (
            <Card className="divide-y gap-0 overflow-hidden py-0">
            {filteredDevices.map((phone) => {
              const expired =
                phone.status === "PENDING" &&
                !!phone.pairingExpiresAt &&
                new Date(phone.pairingExpiresAt) < new Date();
              const busy = busyId === phone.id;
              const specs = formatSpecs(phone);
              const otherBrowsers = phone.linkedBrowsers.filter((b) => b.status !== "PENDING");

              return (
                <div key={phone.id} className="px-5 py-4">
                  <div className="flex items-center gap-4">
                    <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                      <Smartphone className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {phone.label}
                        {specs && <span className="text-muted-foreground font-normal"> — {specs}</span>}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {phone.status === "ACTIVE" &&
                          (phone.lastUsedAt
                            ? `Last used ${dateFormat.format(new Date(phone.lastUsedAt))}`
                            : `Paired ${phone.pairedAt ? dateFormat.format(new Date(phone.pairedAt)) : ""}`)}
                        {phone.status === "PENDING" &&
                          (expired
                            ? "Pairing code expired"
                            : `Awaiting pairing — created ${dateFormat.format(new Date(phone.createdAt))}`)}
                        {phone.status === "REVOKED" && "Revoked — cannot sign in"}
                      </p>
                    </div>
                    <StatusBadge status={phone.status} expired={expired} />

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" disabled={busy} aria-label="Device actions">
                          {busy ? <Loader2 className="animate-spin" /> : <MoreVertical />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {phone.status === "PENDING" && !expired && <ShowPairingDialog device={phone} />}
                        {phone.status === "PENDING" && (
                          <DropdownMenuItem
                            onClick={() => runAction(phone.id, "regenerate", "New pairing code generated")}
                          >
                            <RefreshCw />
                            {expired ? "Generate new code" : "Regenerate code"}
                          </DropdownMenuItem>
                        )}
                        {phone.status === "ACTIVE" && (
                          <RenameDialog deviceId={phone.id} currentLabel={phone.label} />
                        )}
                        {phone.status === "ACTIVE" && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => runAction(phone.id, "revoke", "Device revoked")}
                          >
                            <XCircle />
                            Revoke
                          </DropdownMenuItem>
                        )}
                        {phone.status === "REVOKED" && (
                          <DropdownMenuItem onClick={() => runAction(phone.id, "reactivate", "Device reactivated")}>
                            <Undo2 />
                            Reactivate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem variant="destructive" onClick={() => removeDevice(phone.id)}>
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {otherBrowsers.length > 0 && (
                    <div className="mt-3 ml-13 space-y-2">
                      <Separator />
                      <p className="text-muted-foreground pt-1 text-xs font-medium">
                        Trusted browsers ({otherBrowsers.length})
                      </p>
                      {otherBrowsers.map((browser) => (
                        <div key={browser.id} className="flex items-center gap-3 py-1">
                          <Laptop className="text-muted-foreground size-3.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs">{browser.userAgent ?? browser.label}</p>
                          </div>
                          <StatusBadge status={browser.status} />
                          {browser.status === "ACTIVE" ? (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={busyId === browser.id}
                              aria-label="Revoke browser"
                              onClick={() => runAction(browser.id, "revoke", "Browser revoked")}
                            >
                              <XCircle />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={busyId === browser.id}
                              aria-label="Delete browser"
                              onClick={() => removeDevice(browser.id)}
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
