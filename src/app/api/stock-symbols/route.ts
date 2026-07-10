import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getTopVolatileStockSymbols } from "@/lib/alpaca";
import { missingServerEnv } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAuthed()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const missing = missingServerEnv();
  if (missing.length) {
    return NextResponse.json(
      { error: `Missing env: ${missing.join(", ")}` },
      { status: 500 }
    );
  }
  try {
    const symbols = await getTopVolatileStockSymbols(20);
    return NextResponse.json({ symbols });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
