"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  PlayCircleIcon,
  StopCircleIcon,
  PlayIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usd, pct, num, timeAgo } from "@/lib/format";

type DashboardData = {
  config: {
    symbol: string;
    thresholdPercent: number;
    enabled: boolean;
    referencePrice: number | null;
    lastRunAt: string | null;
    lastAction: string | null;
  };
  account: { equity: number; cash: number; currency: string };
  invested: number | null;
  investedSource: string;
  totalValue: number;
  totalPL: number | null;
  totalPLPercent: number | null;
  price: number | null;
  changePercent: number | null;
  position: {
    symbol: string;
    qty: number;
    marketValue: number;
    avgEntry: number;
    unrealizedPL: number;
    unrealizedPLPercent: number;
  } | null;
  chart: { t: number; equity: number | null }[];
  trades: {
    created_at?: string;
    side: string;
    symbol: string;
    price: number | null;
    qty: number | null;
    notional: number | null;
    reason: string | null;
  }[];
};

function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const toneClass =
    tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-white";
  return (
    <div className="rounded-2xl bg-panel p-5 ring-1 ring-white/5">
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${toneClass}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load.");
        return;
      }
      setData(json);
      setError("");
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  async function toggleBot() {
    if (!data) return;
    setToggling(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !data.config.enabled }),
      });
      await load();
    } finally {
      setToggling(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const plTone =
    data?.totalPL == null ? "neutral" : data.totalPL >= 0 ? "good" : "bad";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Rule<span className="text-accent">Five</span>
          </h1>
          <p className="text-sm text-muted">
            {data
              ? `${data.config.symbol} · ±${data.config.thresholdPercent}% rule`
              : "Loading..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/chart"
            className="inline-flex items-center gap-1.5 rounded-lg bg-panel px-3 py-2 text-sm ring-1 ring-white/10 hover:bg-panel2"
          >
            <ChartBarIcon className="h-4 w-4" aria-hidden />
            Chart
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-lg bg-panel px-3 py-2 text-sm ring-1 ring-white/10 hover:bg-panel2"
          >
            <Cog6ToothIcon className="h-4 w-4" aria-hidden />
            Settings
          </Link>
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-lg bg-panel px-3 py-2 text-sm ring-1 ring-white/10 hover:bg-panel2"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-xl bg-bad/10 p-4 text-sm text-bad ring-1 ring-bad/30">
          {error}
        </div>
      )}

      {loading && !data && <div className="text-muted">Loading dashboard…</div>}

      {data && (
        <>
          <div className="mb-6 flex items-center justify-between rounded-2xl bg-panel p-5 ring-1 ring-white/5">
            <div>
              <div className="text-sm text-muted">Bot status</div>
              <div
                className={`mt-1 flex items-center gap-1.5 text-lg font-semibold ${
                  data.config.enabled ? "text-good" : "text-muted"
                }`}
              >
                {data.config.enabled ? (
                  <PlayCircleIcon className="h-5 w-5" aria-hidden />
                ) : (
                  <StopCircleIcon className="h-5 w-5" aria-hidden />
                )}
                {data.config.enabled ? "Running" : "Stopped"}
              </div>
              <div className="mt-1 text-xs text-muted">
                Last check {timeAgo(data.config.lastRunAt)} ·{" "}
                {data.config.lastAction ?? "no activity yet"}
                {data.config.lastAction?.includes("crypto orders not allowed") &&
                  !data.config.symbol.includes("/") && (
                    <span className="text-muted">
                      {" "}
                      (old crypto-era log — current symbol is{" "}
                      {data.config.symbol})
                    </span>
                  )}
              </div>
            </div>
            <button
              onClick={toggleBot}
              disabled={toggling}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-medium text-white transition disabled:opacity-50 ${
                data.config.enabled ? "bg-bad hover:opacity-90" : "bg-good hover:opacity-90"
              }`}
            >
              {data.config.enabled ? (
                <>
                  <StopIcon className="h-4 w-4" aria-hidden />
                  Stop
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4" aria-hidden />
                  Start
                </>
              )}
            </button>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Total invested (net deposits)"
              value={usd(data.invested)}
              sub={
                data.investedSource === "alpaca"
                  ? "From Alpaca transfers"
                  : data.investedSource === "manual"
                  ? "Manual override"
                  : "Set a starting amount in Settings"
              }
            />
            <StatCard label="Total value" value={usd(data.totalValue)} sub={`Cash ${usd(data.account.cash)}`} />
            <StatCard
              label="Total profit / loss"
              value={usd(data.totalPL)}
              sub={pct(data.totalPLPercent)}
              tone={plTone}
            />
          </div>

          <div className="mb-6 rounded-2xl bg-panel p-5 ring-1 ring-white/5">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-medium text-muted">
                Account value (last 30 days)
              </div>
              <div className="text-xs text-muted">
                {data.price != null && (
                  <>
                    {data.config.symbol} {num(data.price)} ·{" "}
                    <span
                      className={
                        (data.changePercent ?? 0) >= 0 ? "text-good" : "text-bad"
                      }
                    >
                      {pct(data.changePercent)} vs reference
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chart}>
                  <defs>
                    <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5b8cff" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#5b8cff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="t"
                    tickFormatter={(t) =>
                      new Date(t).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                    stroke="#475569"
                    fontSize={11}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    stroke="#475569"
                    fontSize={11}
                    tickFormatter={(v) => `$${Math.round(v)}`}
                    width={56}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a2336",
                      border: "none",
                      borderRadius: 8,
                      color: "#e2e8f0",
                    }}
                    labelFormatter={(t) => new Date(t).toLocaleString()}
                    formatter={(v: number) => [usd(v), "Equity"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="equity"
                    stroke="#5b8cff"
                    strokeWidth={2}
                    fill="url(#eq)"
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-panel p-5 ring-1 ring-white/5">
              <div className="mb-3 text-sm font-medium text-muted">
                Current position
              </div>
              {data.position ? (
                <div className="space-y-2 text-sm">
                  <Row k="Symbol" v={data.position.symbol} />
                  <Row k="Quantity" v={num(data.position.qty)} />
                  <Row k="Avg entry" v={num(data.position.avgEntry)} />
                  <Row k="Market value" v={usd(data.position.marketValue)} />
                  <Row
                    k="Unrealized P/L"
                    v={`${usd(data.position.unrealizedPL)} (${pct(
                      data.position.unrealizedPLPercent
                    )})`}
                    tone={data.position.unrealizedPL >= 0 ? "good" : "bad"}
                  />
                </div>
              ) : (
                <div className="text-sm text-muted">
                  No open position — waiting in cash for a −
                  {data.config.thresholdPercent}% dip.
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-panel p-5 ring-1 ring-white/5">
              <div className="mb-3 text-sm font-medium text-muted">
                Recent bot trades
              </div>
              {data.trades.length === 0 ? (
                <div className="text-sm text-muted">No trades yet.</div>
              ) : (
                <div className="space-y-2">
                  {data.trades.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between border-b border-white/5 pb-2 text-sm last:border-0"
                    >
                      <div className="flex items-center">
                        <span
                          className={`mr-2 inline-flex items-center gap-1 font-semibold uppercase ${
                            t.side === "buy" ? "text-good" : "text-bad"
                          }`}
                        >
                          {t.side === "buy" ? (
                            <ArrowTrendingUpIcon className="h-4 w-4" aria-hidden />
                          ) : (
                            <ArrowTrendingDownIcon className="h-4 w-4" aria-hidden />
                          )}
                          {t.side}
                        </span>
                        <span className="text-muted">{t.symbol}</span>
                      </div>
                      <div className="text-right">
                        <div>
                          {t.notional != null
                            ? usd(t.notional)
                            : `${num(t.qty)} @ ${num(t.price)}`}
                        </div>
                        <div className="text-xs text-muted">
                          {timeAgo(t.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function Row({
  k,
  v,
  tone = "neutral",
}: {
  k: string;
  v: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const toneClass =
    tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-white";
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{k}</span>
      <span className={toneClass}>{v}</span>
    </div>
  );
}
