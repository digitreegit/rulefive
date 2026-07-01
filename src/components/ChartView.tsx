"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";
import BackToDashboardLink from "@/components/BackToDashboardLink";
import {
  ChartBarSquareIcon,
} from "@heroicons/react/24/outline";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { num, pct } from "@/lib/format";

type ChartData = {
  symbol: string;
  price: number | null;
  referencePrice: number | null;
  thresholdPercent: number;
  buyLevel: number | null;
  sellLevel: number | null;
  changePercent: number | null;
  bars: { t: number; o: number; h: number; l: number; c: number; v: number }[];
};

export default function ChartView() {
  const router = useRouter();
  const [data, setData] = useState<ChartData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/chart", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load chart.");
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
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  const chartRows =
    data?.bars.map((b) => ({
      t: b.t,
      close: b.c,
      high: b.h,
      low: b.l,
    })) ?? [];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ChartBarSquareIcon className="h-7 w-7 text-accent" aria-hidden />
            Chart
          </h1>
          <p className="text-sm text-muted">
            {data
              ? `${data.symbol} · last 7 days (1h)`
              : loading
              ? "Loading..."
              : "—"}
          </p>
        </div>
        <BackToDashboardLink />
      </header>

      {error && (
        <div className="mb-6 rounded-xl bg-bad/10 p-4 text-sm text-bad ring-1 ring-bad/30">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="text-muted">Loading chart…</div>
      )}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Current" value={num(data.price)} />
            <Stat
              label="Reference"
              value={
                data.referencePrice != null ? num(data.referencePrice) : "not set"
              }
            />
            <Stat
              label="vs reference"
              value={pct(data.changePercent)}
              tone={
                data.changePercent == null
                  ? "neutral"
                  : data.changePercent >= 0
                  ? "good"
                  : "bad"
              }
            />
            <Stat label="Rule" value={`±${data.thresholdPercent}%`} />
          </div>

          <div className="rounded-2xl bg-panel p-5 ring-1 ring-white/5">
            <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted">
              {data.referencePrice != null && (
                <span className="inline-flex items-center gap-1">
                  <MinusIcon className="h-4 w-4 text-accent" aria-hidden />
                  Reference {num(data.referencePrice)}
                </span>
              )}
              {data.buyLevel != null && (
                <span className="inline-flex items-center gap-1">
                  <ArrowTrendingDownIcon className="h-4 w-4 text-good" aria-hidden />
                  Buy −{data.thresholdPercent}% ({num(data.buyLevel)})
                </span>
              )}
              {data.sellLevel != null && (
                <span className="inline-flex items-center gap-1">
                  <ArrowTrendingUpIcon className="h-4 w-4 text-bad" aria-hidden />
                  Sell +{data.thresholdPercent}% ({num(data.sellLevel)})
                </span>
              )}
            </div>
            <div className="h-80 w-full sm:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartRows}>
                  <defs>
                    <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5b8cff" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#5b8cff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="t"
                    tickFormatter={(t) =>
                      new Date(t).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                      })
                    }
                    stroke="#475569"
                    fontSize={11}
                    minTickGap={40}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    stroke="#475569"
                    fontSize={11}
                    tickFormatter={(v) => num(v, 2)}
                    width={64}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#1a2336",
                      border: "none",
                      borderRadius: 8,
                      color: "#e2e8f0",
                    }}
                    labelFormatter={(t) => new Date(t).toLocaleString()}
                    formatter={(v: number) => [num(v), "Close"]}
                  />
                  {data.referencePrice != null && (
                    <ReferenceLine
                      y={data.referencePrice}
                      stroke="#5b8cff"
                      strokeDasharray="4 4"
                    />
                  )}
                  {data.buyLevel != null && (
                    <ReferenceLine
                      y={data.buyLevel}
                      stroke="#22c55e"
                      strokeDasharray="4 4"
                    />
                  )}
                  {data.sellLevel != null && (
                    <ReferenceLine
                      y={data.sellLevel}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke="#5b8cff"
                    strokeWidth={2}
                    fill="url(#priceFill)"
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const toneClass =
    tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-white";
  return (
    <div className="rounded-2xl bg-panel p-4 ring-1 ring-white/5">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}
