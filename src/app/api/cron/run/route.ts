import { NextRequest, NextResponse } from "next/server";
import { runBot } from "@/lib/engine";
import { CRON_SECRET, missingServerEnv } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  if (!CRON_SECRET) return false;
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const xSecret = req.headers.get("x-cron-secret") ?? "";
  const qsSecret = req.nextUrl.searchParams.get("secret") ?? "";
  return (
    bearer === CRON_SECRET || xSecret === CRON_SECRET || qsSecret === CRON_SECRET
  );
}

async function handle(req: NextRequest) {
  const missing = missingServerEnv();
  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: `Missing env: ${missing.join(", ")}` },
      { status: 500 }
    );
  }
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runBot();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
