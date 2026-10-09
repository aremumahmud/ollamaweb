"use client";

import { useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, HeartPulse, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showRequestTrust, setShowRequestTrust] = useState(false);
  const [requestingTrust, setRequestingTrust] = useState(false);
  const [trustRequested, setTrustRequested] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTrustRequested(false);
    setLoading(true);
    const result = await signIn("credentials", { email, password, otp, redirect: false });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email, password, or code — or this browser hasn't been approved yet.");
      setShowRequestTrust(true);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function requestTrust() {
    setRequestingTrust(true);
    setError(null);
    try {
      const res = await fetch("/api/devices/request-trust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, otp }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not request approval");
      setTrustRequested(true);
      setShowRequestTrust(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRequestingTrust(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-1">
      {/* Banner column */}
      <div className="relative hidden w-1/2 lg:block">
        <Image src="/login-banner.jpg" alt="" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/0" />
        <div className="absolute right-10 bottom-10 left-10 text-white">
          <p className="text-sm font-medium tracking-widest text-white/70 uppercase">
            Care RAG Platform
          </p>
          <h2 className="mt-2 text-3xl leading-tight font-semibold text-balance">
            Every note, every record, one trusted source of truth.
          </h2>
        </div>
      </div>

      {/* Sign-in column */}
      <div className="bg-background flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-start gap-4">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl">
              <HeartPulse className="size-5" />
            </div>
            <div className="grid gap-1">
              <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
              <p className="text-muted-foreground text-sm">
                Sign in to your workspace to continue.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="otp">6-digit code</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              />
              <p className="text-muted-foreground text-xs">
                Nurses: enter the code from your Care RAG Authenticator app. Admins can leave this
                blank.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="text-destructive bg-destructive/10 flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
              >
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            {trustRequested && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
              >
                <CheckCircle2 className="size-4 shrink-0" />
                Request sent — ask your admin to approve this browser, then sign in again.
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </Button>

            {showRequestTrust && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={requestingTrust || !email || !password || !otp}
                onClick={requestTrust}
              >
                {requestingTrust && <Loader2 className="size-4 animate-spin" />}
                {requestingTrust ? "Requesting…" : "Request browser approval"}
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
