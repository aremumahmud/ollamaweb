import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// `req.nextUrl.hostname` reflects the server's own bind address (always
// "localhost" in dev), not the client-facing hostname — the `Host` header is
// what a reverse proxy (Cloudflare Tunnel included) actually forwards, so
// that's what we check here.
function stripPort(host: string): string {
  if (host.startsWith("[")) {
    const end = host.indexOf("]");
    return end === -1 ? host : host.slice(1, end);
  }
  return host.replace(/:\d+$/, "");
}

// Loopback and RFC1918 LAN ranges — anything else (e.g. a *.trycloudflare.com
// or other public tunnel hostname) is treated as publicly exposed.
function isLocalHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  return false;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = (req.auth?.user as { role?: string } | undefined)?.role;

  // The admin surface never leaves the private network/localhost, even for
  // an authenticated admin — a public tunnel (used to let nurse devices
  // reach the app from outside the LAN) should only ever expose nurse-usable
  // routes. Checked before auth so it can't be bypassed by signing in.
  const isAdminSurface = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const requestHost = stripPort(req.headers.get("host") ?? req.nextUrl.hostname);
  if (isAdminSurface && !isLocalHost(requestHost)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const PUBLIC_PATHS = ["/login", "/api/devices/pair", "/api/devices/request-trust"];

  if (!req.auth) {
    // /login (browser), /api/devices/pair (called by the unauthenticated
    // companion mobile app during device pairing), and
    // /api/devices/request-trust (called by an unauthenticated browser
    // requesting to be trusted, vouched for by password + phone OTP).
    if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  const isNurseRoute = pathname.startsWith("/nurse") || pathname.startsWith("/api/patients");

  if (isAdminSurface && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  if (isNurseRoute && role !== "NURSE" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|png|gif|svg|webp|ico|mjs|css|map)$).*)",
  ],
};
