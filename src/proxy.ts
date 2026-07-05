import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Runs on every page request:
 * 1. Forwards the pathname as `x-pathname` so the root layout can apply
 *    maintenance mode (the layout can't see the URL otherwise).
 * 2. Optimistic auth gate for protected areas — checks the session cookie
 *    only (no DB here); pages still validate the real session server-side.
 */

const PROTECTED_PREFIXES = [
  "/settings",
  "/onboarding",
  "/admin",
  "/saved",
  "/write",
  "/dashboard",
  "/notifications",
];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // All pages, excluding static assets and API routes (APIs guard themselves)
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
};
