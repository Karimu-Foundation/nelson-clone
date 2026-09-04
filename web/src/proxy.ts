import { NextRequest, NextResponse } from "next/server";

import { ACCESS_COOKIE, accessToken } from "@/lib/access";

/**
 * Shared-password gate (Next.js proxy convention).
 *
 * The knowledge base in this repository holds Karimu's real staff roster,
 * financial figures and personal details, so this app must never be openly
 * reachable. It fails CLOSED: with no APP_ACCESS_PASSWORD configured, nothing
 * is served at all.
 *
 * On a Vercel Pro plan you can use Vercel Authentication (Project → Settings →
 * Deployment Protection → All Deployments) instead and drop this file.
 */
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/login" || pathname === "/api/access") {
    return NextResponse.next();
  }

  const secret = process.env.APP_ACCESS_PASSWORD;
  const cookie = req.cookies.get(ACCESS_COOKIE)?.value;

  if (secret && cookie && cookie === (await accessToken(secret))) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Not authorised. Sign in at /login." },
      { status: 401 },
    );
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
