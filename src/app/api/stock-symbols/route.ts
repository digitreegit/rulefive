import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getTopVolatileStockSymbols } from "@/lib/alpaca";
import { FALLBACK_VOLATILE_STOCKS, isStockSymbol, missingServerEnv } from "@/lib/config";

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
    const symbols = (await getTopVolatileStockSymbols(20)).filter(isStockSymbol);
    return NextResponse.json(
      { symbols },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { symbols: FALLBACK_VOLATILE_STOCKS },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
