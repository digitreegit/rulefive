import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getConfig, updateConfig } from "@/lib/supabase";
import { getTopVolatileStockSymbols } from "@/lib/alpaca";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isAuthed()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const cfg = await getConfig();
  return NextResponse.json({
    symbol: cfg.symbol,
    thresholdPercent: Number(cfg.threshold_percent),
    enabled: cfg.enabled,
    referencePrice: cfg.reference_price,
    manualInvestedOverride: cfg.manual_invested_override,
    lastRunAt: cfg.last_run_at,
    lastAction: cfg.last_action,
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthed()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (typeof body.symbol === "string" && body.symbol.trim()) {
    const next = body.symbol.trim().toUpperCase();
    if (next.includes("/")) {
      return NextResponse.json(
        { error: "Crypto symbols are not supported. Choose a US stock." },
        { status: 400 }
      );
    }
    const allowed = await getTopVolatileStockSymbols(20);
    if (!allowed.includes(next)) {
      return NextResponse.json(
        { error: `Symbol not supported: ${next}` },
        { status: 400 }
      );
    }
    patch.symbol = next;
    patch.reference_price = null;
    patch.last_action = `symbol changed to ${next}`;
  }
  if (body.thresholdPercent != null) {
    const t = Number(body.thresholdPercent);
    if (!Number.isNaN(t) && t > 0 && t <= 90) patch.threshold_percent = t;
  }
  if (typeof body.enabled === "boolean") {
    patch.enabled = body.enabled;
  }
  if ("manualInvestedOverride" in body) {
    const v = body.manualInvestedOverride;
    patch.manual_invested_override =
      v === null || v === "" ? null : Number(v);
  }
  // Allow a manual reset of the reference (re-anchor on next run).
  if (body.resetReference === true) {
    patch.reference_price = null;
    patch.last_action = "reference reset — waiting for next check";
  }

  const cfg = await updateConfig(patch);
  return NextResponse.json({
    ok: true,
    symbol: cfg.symbol,
    thresholdPercent: Number(cfg.threshold_percent),
    enabled: cfg.enabled,
    referencePrice: cfg.reference_price,
    manualInvestedOverride: cfg.manual_invested_override,
  });
}
