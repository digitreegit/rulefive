import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getConfig } from "@/lib/supabase";
import { getBars, getLatestPrice } from "@/lib/alpaca";
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
    const cfg = await getConfig();
    const symbol = cfg.symbol;
    const [bars, price] = await Promise.all([
      getBars(symbol, "1Hour", 168),
      getLatestPrice(symbol).catch(() => null),
    ]);

    const reference =
      cfg.reference_price != null ? Number(cfg.reference_price) : null;
    const threshold = Number(cfg.threshold_percent) || 5;

    return NextResponse.json({
      symbol,
      price,
      referencePrice: reference,
      thresholdPercent: threshold,
      buyLevel: reference != null ? reference * (1 - threshold / 100) : null,
      sellLevel: reference != null ? reference * (1 + threshold / 100) : null,
      changePercent:
        reference != null && price != null
          ? ((price - reference) / reference) * 100
          : null,
      bars,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
