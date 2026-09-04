import { NextRequest } from "next/server";

import { ACCESS_COOKIE, accessToken } from "@/lib/access";

export const runtime = "nodejs";

/** Tells the login page whether the server has a password configured at all. */
export function GET() {
  return Response.json({ configured: Boolean(process.env.APP_ACCESS_PASSWORD) });
}

export async function POST(req: NextRequest) {
  const secret = process.env.APP_ACCESS_PASSWORD;
  if (!secret) {
    return Response.json(
      {
        error:
          "No APP_ACCESS_PASSWORD is set on the server, so nobody can sign in. Set it in Vercel → Project → Settings → Environment Variables and redeploy.",
      },
      { status: 503 },
    );
  }

  let password = "";
  try {
    const body = (await req.json()) as { password?: string };
    password = body.password ?? "";
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const supplied = await accessToken(password);
  const expected = await accessToken(secret);
  if (supplied !== expected) {
    return Response.json({ error: "Wrong password." }, { status: 401 });
  }

  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${ACCESS_COOKIE}=${expected}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${
      60 * 60 * 24 * 30
    }`,
  );
  return res;
}
