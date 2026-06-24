import { NextRequest, NextResponse } from "next/server";
import { checkPassword, setSessionCookie } from "@/lib/auth";
import { APP_PASSWORD, AUTH_SECRET } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!APP_PASSWORD || !AUTH_SECRET) {
    return NextResponse.json(
      { ok: false, error: "Server login is not configured (APP_PASSWORD / AUTH_SECRET)." },
      { status: 500 }
    );
  }
  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if (!checkPassword(body.password ?? "")) {
    return NextResponse.json({ ok: false, error: "Wrong password." }, { status: 401 });
  }
  setSessionCookie();
  return NextResponse.json({ ok: true });
}
