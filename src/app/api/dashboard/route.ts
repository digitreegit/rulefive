import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getConfig, recentTrades } from "@/lib/supabase";
import {
  getAccount,
  getLatestPrice,
  getNetDeposits,
  getPortfolioHistory,
  getPositionFor,
} from "@/lib/alpaca";
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
    const [account, history, netDeposits, trades] = await Promise.all([
      getAccount(),
      getPortfolioHistory("1M", "1D").catch(() => null),
      getNetDeposits(),
      recentTrades(20).catch(() => []),
    ]);

    let price: number | null = null;
    try {
      price = await getLatestPrice(cfg.symbol);
    } catch {
      price = null;
    }

    const position = await getPositionFor(cfg.symbol).catch(() => null);

    const equity = parseFloat(account.equity || account.portfolio_value || "0");
    const cash = parseFloat(account.cash || "0");
    const invested =
      cfg.manual_invested_override != null
        ? Number(cfg.manual_invested_override)
        : netDeposits;

    const totalPL = invested != null ? equity - invested : null;
    const totalPLPercent =
      invested != null && invested > 0 ? (equity - invested) / invested * 100 : null;

    const reference = cfg.reference_price != null ? Number(cfg.reference_price) : null;
    const changePercent =
      reference != null && price != null
        ? ((price - reference) / reference) * 100
        : null;

    const chart =
      history && history.timestamp
        ? history.timestamp.map((t, i) => ({
            t: t * 1000,
            equity: history.equity[i],
          }))
        : [];

    return NextResponse.json({
      config: {
        symbol: cfg.symbol,
        thresholdPercent: Number(cfg.threshold_percent),
        enabled: cfg.enabled,
        referencePrice: reference,
        lastRunAt: cfg.last_run_at,
        lastAction: cfg.last_action,
      },
      account: {
        equity,
        cash,
        currency: account.currency,
      },
      invested,
      investedSource:
        cfg.manual_invested_override != null
          ? "manual"
          : netDeposits != null
          ? "alpaca"
          : "unknown",
      totalValue: equity,
      totalPL,
      totalPLPercent,
      price,
      changePercent,
      position: position
        ? {
            symbol: position.symbol,
            qty: parseFloat(position.qty),
            marketValue: parseFloat(position.market_value),
            avgEntry: parseFloat(position.avg_entry_price),
            unrealizedPL: parseFloat(position.unrealized_pl),
            unrealizedPLPercent: parseFloat(position.unrealized_plpc) * 100,
          }
        : null,
      chart,
      trades,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
