import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic auth gate: checks for the session cookie only (no DB call —
 * not possible at the proxy layer). Pages/APIs still validate the real
 * session server-side; this just gives logged-out users a fast redirect.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/settings/:path*",
    "/onboarding",
    "/admin/:path*",
    "/saved/:path*",
    "/write/:path*",
    "/dashboard/:path*",
    "/notifications/:path*",
  ],
};
